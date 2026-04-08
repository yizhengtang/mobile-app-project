# ✈️ Wayfarer — AI Travel Planner

> A React Native mobile app powered by AWS and Claude AI that generates intelligent, constraint-aware day-by-day travel itineraries — and adapts them in real time.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Why Wayfarer Is Different](#2-why-wayfarer-is-different)
   - Real-World Constraint Awareness
   - Conversational Refinement
   - Live Disruption Alerts
   - Time-Aware Planning with Visit Quality Intelligence
   - Transport-Mode Intelligence
   - Meal and Break Slots
   - Budget Awareness
   - Weather-Reactive Replanning
   - "Surprise Me" Mode
3. [Feature Breakdown](#3-feature-breakdown)
4. [System Architecture](#4-system-architecture)
5. [Tech Stack](#5-tech-stack)
6. [AWS Services Deep Dive](#6-aws-services-deep-dive)
7. [External API Integrations](#7-external-api-integrations)
8. [React Native Frontend](#8-react-native-frontend)
9. [AI & Prompt Engineering](#9-ai--prompt-engineering)
10. [Data Models](#10-data-models)
11. [API Reference](#11-api-reference)
12. [Security Design](#12-security-design)
13. [Getting Started](#13-getting-started)
14. [Deployment](#14-deployment)
15. [Future Roadmap](#15-future-roadmap)

---

## 1. Project Overview

Wayfarer is a full-stack mobile application that transforms the way people plan travel. A user provides their destination, travel dates, accommodation locations, a list of places they want to visit, and their preferred transport modes. The app then fetches live data — opening hours, weather forecasts, travel times, crowd levels — and feeds all of it into an AI model to generate a highly personalised, logistically sound itinerary for each day of the trip.

Unlike static AI chat outputs, Wayfarer's plans are structured, editable, and persistent. Users can refine plans through natural language ("swap the museum to day 2" or "I want a slower morning on Saturday"), and the app re-runs the planning pipeline in the background. On the morning of each travel day, a background job re-checks conditions and pushes an updated plan if anything has changed.

The project is architected as a production-grade system: serverless AWS backend, OAuth 2.0 authentication, fully async plan generation via queues, structured DynamoDB data model, and a clean React Native (Expo) frontend for iOS and Android.

---

## 2. Why Wayfarer Is Different

Most travel planning tools fall into one of two failure modes:

**Static list generators** — they produce a day-by-day plan but make no attempt to sequence stops logically, respect opening hours, account for travel time between locations, or adapt to weather. You end up visiting a museum that closes at 17:00 after scheduling dinner at 16:30 across town.

**Generic AI chat** — tools like ChatGPT can write a travel plan, but the output is unstructured prose with no persistence, no live data, and no ability to edit individual pieces without re-generating everything.

Wayfarer addresses both failure modes with six core differentiators:

### Real-World Constraint Awareness

Before the AI generates any output, the orchestration layer fetches:

- Live opening hours and temporary closures from Google Places
- A 7-day weather forecast for the destination from OpenWeatherMap
- Driving, transit, cycling, and walking times between every pair of attractions using the Google Directions Matrix API
- Estimated crowd levels (peak vs. off-peak hours) sourced from Google Popular Times

All of this data is embedded into the AI prompt as structured context. The model is instructed to never schedule a closed venue, to prefer indoor activities on forecast rain days, and to optimise stop ordering to minimise total travel time. The result is a plan that is not just plausible — it is operationally executable.

### Conversational Refinement

After a plan is generated, the user enters a persistent conversation thread linked to that trip. Every message the user sends (e.g. "move the art gallery to Sunday afternoon" or "I'd like a 2-hour lunch break on day 3") is processed by the Lambda orchestrator alongside the full current plan as context. The model returns a structured JSON diff — only the changed segments — which is applied to the plan in DynamoDB and reflected in the UI instantly. This avoids re-generating the full plan on every edit and keeps refinement cheap and fast.

### Live Disruption Alerts

A nightly background Lambda job, triggered by an EventBridge rule at 07:00 local time for each active trip day, re-fetches opening hours and weather for that day's scheduled stops. If anything has changed — a venue is unexpectedly closed, a storm is forecast — the job invokes the AI again to generate a revised plan for that day only, stores the revision in DynamoDB, and pushes a push notification to the user via Amazon SNS with a summary of what changed and why.

### Time-Aware Planning with Visit Quality Intelligence

Knowing a venue is open is the baseline. Wayfarer goes further by reasoning about *when* to visit, not just *whether* to visit. Google Popular Times data exposes hourly crowd density per day of the week. The orchestrator classifies each attraction into one of three visit-quality profiles:

- **Crowd-sensitive** (Louvre, Eiffel Tower, Sagrada Família) — the prompt instructs the AI to schedule these before 10:00 or after 15:30 on weekdays, and to flag weekend morning visits as high-congestion with a time estimate penalty of +40%
- **Time-of-day dependent** (viewpoints, gardens, outdoor markets) — scheduled at their photogenically or experientially optimal window (golden hour for viewpoints, morning for markets before stalls pack up)
- **Flexible** (bookshops, covered markets, department stores) — used as schedule buffers, slotted in around the crowd-sensitive anchors

Each stop in the output includes an `optimalVisitWindow` field and a `crowdLevel` indicator (`low` / `moderate` / `high`) for the scheduled time. The itinerary view surfaces this as a colour-coded badge so the user can see at a glance which stops are likely to be busy.

### Transport-Mode Intelligence

Wayfarer treats city transit as a first-class input, not an afterthought. Rather than computing a single point-to-point distance, the orchestrator builds a multi-modal leg plan for each transition between stops:

For cities with structured public transit (Paris, Tokyo, London, NYC), the app queries the Google Directions API with `mode=transit` to retrieve the actual recommended leg sequence — e.g. "walk 4 min to Cité station, take Line 4 towards Montrouge, exit at Saint-Germain-des-Prés (6 min), walk 3 min". This full leg sequence is embedded in the prompt per stop transition, and is surfaced verbatim in the `StopCard` transport block in the UI.

The orchestrator applies city-specific heuristics stored in a lightweight configuration table in DynamoDB:

```json
{
  "city": "Paris",
  "walkingZones": ["Marais", "Saint-Germain", "Montmartre"],
  "transitLines": ["Métro", "RER", "Vélib"],
  "avoidDriving": true,
  "avoidTransitPeakHours": ["08:00-09:30", "17:30-19:30"]
}
```

The AI uses this configuration to make transport suggestions that feel locally knowledgeable — recommending Vélib for flat inter-zone hops in Paris, JR Pass lines vs subway for Tokyo, the Elizabeth line vs the Piccadilly line at different times in London. If the user's preferred transport modes conflict with city norms (e.g. "drive everywhere" in central Paris), the AI flags this in the plan narrative and proposes an alternative.

### Meal and Break Slots

No trip plan is realistic if it treats humans as tireless attraction-processing machines. Wayfarer bakes meals and breaks into the schedule as first-class stops, not afterthoughts.

The orchestrator applies a default meal cadence based on the user's pace preference:

| Pace | Breakfast | Lunch | Dinner |
|---|---|---|---|
| Relaxed | 08:30 – 09:30 (sit-down) | 12:30 – 13:30 (sit-down) | 19:00 – 20:30 (sit-down) |
| Moderate | 08:00 – 08:30 (café) | 13:00 – 13:45 (casual) | 19:30 – 21:00 (sit-down) |
| Packed | 07:30 (grab-and-go) | 12:30 – 13:00 (counter service) | 19:00 – 20:00 (moderate) |

Meal stops are not generic placeholders. The orchestrator calls the Google Places Nearby Search API with `type=restaurant` filtered by cuisine preferences (stored in the user's profile), minimum rating (`≥4.0`), and price level matching the budget tier. The top 3 candidates are passed to the AI, which selects the one best positioned along that day's route — minimising detour — and includes it in the plan as a `food` category stop with estimated cost, cuisine type, and a one-line description.

Rest breaks (15-minute sit-down pauses in parks or cafés) are automatically inserted after any sequence of 3+ consecutive non-food stops, or after any stop with a duration exceeding 2 hours. These are flagged as `optional` in the data model so power users can remove them without disrupting the surrounding schedule.

### Budget Awareness

Each generated plan includes a per-day and per-trip budget breakdown surfaced in a dedicated Budget tab on the trip detail screen. The breakdown covers four cost categories:

**Entrance fees** — fetched from Google Places where available; supplemented by a curated static dataset of major attraction entrance fees maintained as a JSON file in S3, updated monthly. If no fee data is available, the stop is marked as "fee unknown" with a prompt to check the venue's website.

**Transport costs** — estimated from the transit leg data. For metro/bus trips, the cost is computed from the city's fare configuration table (stored in DynamoDB per city): single ticket price, day pass threshold (if the user would exceed N single trips, recommend a day pass), and zone-based pricing for cities like London.

**Meals** — estimated from the Google Places `price_level` field mapped to a per-city cost range (e.g. Paris `price_level: 2` ≈ €15–25 per person for lunch).

**Discretionary** — a configurable buffer (default: 15% of daily total) for incidentals, snacks, and impulse purchases.

The AI is given the user's stated daily budget at prompt time and instructed to flag if the generated plan exceeds it, suggesting trade-offs (e.g. "replacing the Seine river cruise with a walk along Quai Branly saves ~€18 and takes a similar route").

The budget breakdown is stored on the `DayPlan` object and rendered as a simple cost card at the top of each day view.

### Weather-Reactive Replanning

Weather awareness in Wayfarer operates at two levels:

**At generation time** — the 7-day forecast is embedded in the prompt per travel day. The AI applies a simple but effective rule set: if precipitation probability exceeds 60% for a given day, outdoor-primary stops (parks, viewpoints, walking tours, open-air markets) are deprioritised and replaced with indoor alternatives from the same destination. The original outdoor stops are retained in a `deferred` list and rescheduled to the nearest forecast-clear day where schedule space permits.

**At disruption check time** — the morning Lambda re-fetches the day's forecast. If conditions have materially worsened since the plan was generated (precipitation probability has crossed the 60% threshold, or a storm warning has been issued), it triggers a day-level replan. The replanning prompt explicitly receives the current plan, the weather update, and an instruction to swap outdoor stops for indoor alternatives while preserving must-do constraints. The revised plan is pushed to the user with a notification: *"Rain forecast today — we've moved your Montmartre walk to Thursday and swapped in the Musée d'Orsay instead."*

Weather sensitivity is configurable per user: `weatherSensitivity: "low" | "medium" | "high"`. At `low`, only severe weather (storms, heavy rain >80%) triggers a replan. At `high`, any forecast rain above 40% prompts a swap.

### "Surprise Me" Mode

Beyond the user's explicit attraction list, Wayfarer can populate up to 30% of each day's schedule with AI-curated hidden gems — local spots that appear frequently in travel blogs and local guides but rarely in mainstream tourist itineraries.

When the user enables Surprise Me mode on trip creation, the orchestrator sends an additional pre-planning request to Bedrock before the main plan generation. The prompt asks Claude to suggest 3–5 under-the-radar stops per day for the destination, constrained to:

- Within 800m walking distance of the user's planned route (computed from the known anchor stops)
- Rated ≥ 4.2 on Google Places with ≥ 50 reviews (signal of genuine quality without mass tourism)
- Not in the top-20 most-visited attractions for that city (filtered against a static popularity list per city stored in S3)
- Thematically varied from the user's existing list (if the user has three museums, surprise stops lean towards street food, neighbourhood walks, local markets)

The suggestions are returned as a structured list with a short justification for each ("a neighbourhood bakery that locals queue for — 4 mins off your route between the Marais and Bastille"). These are injected into the main planning prompt alongside the user's explicit list, marked as `suggested` rather than `required` so the AI can freely reorder or drop them if the schedule is too tight.

In the itinerary UI, surprise stops are visually marked with a distinct icon. Tapping one opens a card explaining why it was suggested. The user can promote it to a confirmed stop, replace it with a different AI suggestion, or dismiss it.

---

## 3. Feature Breakdown

### Trip Creation

- User inputs: destination city, start date, end date, accommodation addresses (one per stay), list of attractions/restaurants/POIs, preferred transport modes (walk, drive, transit, cycle), daily budget range, pace preference (relaxed / moderate / packed), and any accessibility requirements
- Attractions can be added by name (resolved via Google Places Autocomplete) or by dropping a pin on a map
- User can mark certain attractions as "must-do on a specific date" (hard constraints) vs. flexible

### Itinerary Generation

- Full trip plan generated asynchronously via SQS queue — user sees a loading state while the plan builds in the background (typically 8–15 seconds)
- Each day's plan includes: an ordered list of stops, estimated arrival and departure time at each stop, recommended transport mode between stops with full transit leg details (e.g. "walk 4 min → Line 4 → walk 3 min"), weather context for the day, and a short narrative introduction written by the AI
- Stops are colour-coded by category: food, culture, nature, shopping, transit
- Crowd-level badges on each stop indicate expected congestion at the scheduled time
- Meal stops (breakfast, lunch, dinner) and rest breaks are automatically inserted at logical points in the day, with real restaurant suggestions positioned along the route
- "Surprise Me" mode injects AI-curated hidden gems alongside the user's must-visit list

### Budget Overview

- Per-day and per-trip cost breakdown covering entrance fees, transport, meals, and a configurable discretionary buffer
- Budget card displayed at the top of each day view; a trip-level summary on the overview screen
- AI flags if the generated plan exceeds the stated daily budget and suggests trade-offs
- Transport cost intelligence: calculates whether a day pass is cheaper than individual tickets for that day's transit legs

### Plan Editing

- Tap any stop to edit its time slot, swap it with another day, remove it, or replace it with an AI suggestion ("suggest something similar nearby")
- Type a natural language instruction into the chat box — changes are reflected in under 5 seconds
- Full edit history stored per trip; user can revert to any previous version

### Morning Briefing

- Push notification at 07:00 on each travel day
- Summary card in-app: today's weather, any plan changes, first stop reminder, estimated steps for the day
- If disruptions were detected overnight, a diff view shows what changed and the reasoning

### Saved Trips & Sharing

- All trips saved to user's account, accessible from any device
- Trips can be exported as a PDF itinerary or shared as a read-only link
- Collaborative mode (roadmap): invite travel companions to view and suggest edits

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React Native (Expo)                          │
│         iOS + Android  ·  Trip input  ·  Itinerary viewer          │
│              Conversational refinement  ·  Push alerts              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS / REST
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Amazon API Gateway                            │
│            JWT validation (Cognito)  ·  Rate limiting               │
│                    Request routing  ·  CORS                         │
└──────┬──────────────────────┬──────────────────────────┬────────────┘
       │                      │                          │
       ▼                      ▼                          ▼
┌─────────────┐   ┌──────────────────────┐   ┌────────────────────┐
│   Cognito   │   │  Lambda: Trip CRUD   │   │ Lambda: Chat/Edit  │
│  User Pool  │   │  Create, read, update│   │ Conversational     │
│  Auth + JWT │   │  delete trips        │   │ refinement handler │
└─────────────┘   └──────────┬───────────┘   └────────┬───────────┘
                             │                        │
                             ▼                        ▼
                  ┌──────────────────────────────────────────────┐
                  │              Amazon SQS                       │
                  │   plan-generation-queue  ·  edit-queue        │
                  └──────────────────┬───────────────────────────┘
                                     │
                                     ▼
                  ┌──────────────────────────────────────────────┐
                  │         Lambda: Plan Orchestrator             │
                  │                                              │
                  │  1. Fetch Google Places + Popular Times      │
                  │  2. Fetch weather forecast                   │
                  │  3. Fetch transit leg details (per pair)     │
                  │  4. Fetch nearby restaurant candidates       │
                  │  5. Run Surprise Me pre-planning (optional)  │
                  │  6. Build structured AI prompt               │
                  │  7. Call AWS Bedrock (Claude)                │
                  │  8. Parse + validate JSON response           │
                  │  9. Write plan + budget to DynamoDB          │
                  │  10. Notify client via WebSocket (API GW)    │
                  └──────────────────────────────────────────────┘
                                     │
              ┌──────────────────────┼─────────────────────────┐
              ▼                      ▼                         ▼
  ┌────────────────────┐  ┌──────────────────┐   ┌────────────────────┐
  │     DynamoDB       │  │    S3 Bucket      │   │   ElastiCache      │
  │  trips, users,     │  │  Cached Places   │   │  Session tokens    │
  │  plans, versions   │  │  API responses   │   │  Rate limit state  │
  └────────────────────┘  └──────────────────┘   └────────────────────┘

                  ┌──────────────────────────────────────────────┐
                  │   EventBridge (daily 07:00 rule)              │
                  │         ▼                                    │
                  │   Lambda: Morning Disruption Check            │
                  │   Re-fetches conditions  ·  AI re-plans      │
                  │         ▼                                    │
                  │     Amazon SNS → Push Notification           │
                  └──────────────────────────────────────────────┘

  ┌──────────────────┐    ┌────────────────────────┐
  │   CloudWatch     │    │   AWS Secrets Manager  │
  │  Logs, metrics,  │    │  Google API keys,      │
  │  alarms          │    │  Bedrock config        │
  └──────────────────┘    └────────────────────────┘
```

### Request Flow: Plan Generation

1. User submits trip form on the React Native app
2. `POST /trips` hits API Gateway, which validates the Cognito JWT
3. Trip CRUD Lambda writes a skeleton trip record to DynamoDB (status: `pending`) and enqueues a message to `plan-generation-queue` on SQS
4. API Gateway responds immediately with the `tripId` — the client polls for status or listens on a WebSocket connection
5. Plan Orchestrator Lambda is triggered by the SQS message
6. Orchestrator fires parallel requests to: Google Places (place details + Popular Times), OpenWeatherMap (7-day forecast), Google Directions API (full transit leg sequences per stop pair), and Google Places Nearby Search (restaurant candidates per route segment)
7. If Surprise Me mode is enabled, a pre-planning Bedrock call generates 3–5 hidden gem suggestions per day, filtered against the city's popularity list in S3
8. Orchestrator assembles all fetched data into a structured prompt and sends it to AWS Bedrock (Claude)
9. Claude returns a structured JSON plan including stop sequence, transport legs, meal slots, surprise stops, and a per-day budget breakdown
10. The orchestrator validates the response against the `TripPlan` Zod schema, retrying up to 2 times on failure
11. Plan and budget are written to DynamoDB; trip status updated to `ready`
12. Client is notified via API Gateway WebSocket push; itinerary view renders

---

## 5. Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React Native (Expo SDK 51+) | Cross-platform iOS and Android |
| TypeScript | Type safety across the entire frontend codebase |
| Expo Router | File-based navigation (tab + stack) |
| React Query (TanStack) | Server state management, background refetching |
| Zustand | Local client state (auth session, UI state) |
| React Native Maps | Interactive map view for itinerary visualisation |
| Expo Notifications | Push notification registration and handling |
| React Native Reanimated | Smooth animations and gesture transitions |
| Axios | HTTP client with request/response interceptors |

### Backend

| Technology | Purpose |
|---|---|
| Node.js 20 (Lambda runtime) | Lambda function runtime |
| TypeScript | Type-safe Lambda handlers |
| AWS CDK (TypeScript) | Infrastructure as Code — all AWS resources defined in code |
| Zod | Runtime schema validation for all API inputs and AI outputs |

### AWS Services

See [Section 6](#6-aws-services-deep-dive) for details.

### External APIs

See [Section 7](#7-external-api-integrations) for details.

---

## 6. AWS Services Deep Dive

### Amazon Cognito

Handles all user identity. Users sign up and log in via the Cognito Hosted UI (or via the Expo app using `amazon-cognito-identity-js`). On successful authentication, Cognito issues a JWT ID token and access token. Every request to API Gateway includes the `Authorization: Bearer <idToken>` header; API Gateway validates the token signature against the Cognito JWKS endpoint before forwarding to Lambda.

User Pool attributes stored: `email`, `given_name`, `family_name`, `locale` (for morning briefing timezone), `custom:preferredTransport`.

### Amazon API Gateway (HTTP API)

HTTP API (v2) is used rather than REST API for lower latency and cost. Routes:

- `POST /trips` — create a new trip (triggers async plan generation)
- `GET /trips` — list all trips for authenticated user
- `GET /trips/{tripId}` — get trip detail including current plan
- `PATCH /trips/{tripId}` — update trip metadata
- `DELETE /trips/{tripId}` — delete a trip
- `POST /trips/{tripId}/chat` — send a conversational refinement message
- `GET /trips/{tripId}/versions` — list all plan versions
- `POST /trips/{tripId}/revert/{versionId}` — revert to a previous plan version

A WebSocket API (separate) handles real-time plan-ready notifications during the async generation flow. Connections are keyed by `connectionId` and associated with a `userId` in DynamoDB.

### AWS Lambda

Four distinct Lambda functions, each with a single responsibility:

**Trip CRUD Lambda** — handles all synchronous CRUD operations against DynamoDB. Thin handler: validates input with Zod, reads/writes DynamoDB, returns response. Max timeout: 10 seconds.

**Plan Orchestrator Lambda** — the core business logic. Triggered by SQS. Fetches external data in parallel using `Promise.all`, constructs the AI prompt, calls Bedrock, validates the response, persists the plan. Max timeout: 5 minutes (plan generation can take up to 60 seconds on complex multi-day trips).

**Chat Refinement Lambda** — handles the conversational edit flow. Receives the user's message and the current plan as input, sends both to Bedrock with a system prompt instructing the model to return a JSON diff only, applies the diff to the stored plan. Max timeout: 60 seconds.

**Morning Disruption Lambda** — triggered daily by EventBridge. Queries DynamoDB for all trips with a travel day matching today's date, re-fetches conditions for each, calls Bedrock if changes are detected, updates the plan, and fires an SNS notification. Max timeout: 15 minutes (processes all active trips in batches).

All Lambda functions share a Lambda Layer containing shared utilities: DynamoDB client, Bedrock client, Secrets Manager resolver, Zod schemas, and error handling middleware.

### Amazon SQS

Two standard queues:

**`plan-generation-queue`** — receives a message when a trip is created. Message body includes `tripId`, `userId`, and the full trip input payload. Visibility timeout: 6 minutes (longer than the orchestrator's max execution time to prevent duplicate processing). Dead-letter queue configured with 3 retry attempts before messages are parked for investigation.

**`edit-queue`** — receives messages for conversational refinements. Lower priority; visibility timeout: 90 seconds.

### Amazon DynamoDB

Single-table design. Partition key: `PK`, sort key: `SK`.

Access patterns supported:
- Get a user's profile
- List all trips for a user
- Get a specific trip
- Get the current plan for a trip
- List all plan versions for a trip
- Get a specific plan version
- Get all active trips with a travel day today (used by morning Lambda via a GSI)

GSI: `GSI1` on `GSI1PK` / `GSI1SK` for the "trips by travel date" access pattern needed by the morning disruption Lambda.

### Amazon S3

Used as a cache layer for Google Places API responses. Place details (name, address, opening hours, photos, coordinates) fetched from Google are serialised to JSON and stored in S3 with a 24-hour TTL enforced via S3 Lifecycle rules. On subsequent plan generations referencing the same `placeId`, the orchestrator checks S3 before hitting the Google API — significantly reducing API costs for popular destinations.

Also used to store exported PDF itineraries.

### Amazon ElastiCache (Redis)

Two use cases:

**Session/rate-limit state** — tracks per-user API call counts within a rolling 60-second window to enforce application-level rate limits independently of API Gateway throttling.

**WebSocket connection map** — maps `userId` → `connectionId` for the API Gateway WebSocket API, enabling the Plan Orchestrator Lambda (which has no knowledge of the WebSocket connection) to look up the right connection and push a "plan ready" event.

### Amazon EventBridge

A scheduled rule fires daily. The rule targets the Morning Disruption Lambda. The rule uses a cron expression adjusted per trip's local timezone (stored on the trip record); in practice a single 07:00 UTC rule fires, and the Lambda filters trips whose local 07:00 UTC offset matches.

### Amazon SNS

The Morning Disruption Lambda publishes a notification to an SNS topic. Two subscribers:

1. **SQS queue** — for fan-out and buffering
2. **Lambda: Push Sender** — subscribes to the SNS topic and calls the Expo Push Notifications API to deliver the morning briefing to the user's device

### AWS Secrets Manager

All third-party API keys (Google Places, OpenWeatherMap, Expo push token secret) are stored in Secrets Manager and resolved at Lambda cold start. Lambda execution roles have IAM policies granting `secretsmanager:GetSecretValue` on the specific secret ARNs only — no wildcard access.

### Amazon CloudWatch

Structured JSON logs emitted by every Lambda using a shared logger utility. Log groups are named by Lambda function. A CloudWatch dashboard surfaces: plan generation latency (P50, P95), SQS queue depth, DynamoDB consumed capacity, Bedrock invocation count and latency, and Lambda error rates. Alarms fire to an SNS ops topic when error rate exceeds 1% or SQS DLQ depth exceeds 0.

---

## 7. External API Integrations

### Google Places API

Used for three purposes:

**Autocomplete** (client-side) — as the user types an attraction name in the trip creation form, the React Native app calls the Places Autocomplete API and displays matching suggestions. The user selects a suggestion; the app stores the `placeId`.

**Place Details** (server-side, in the orchestrator) — given a `placeId`, the orchestrator fetches the full place record including: `name`, `formatted_address`, `geometry.location` (lat/lng), `opening_hours.periods` (structured opening and closing times per day of week), `rating`, `user_ratings_total`, `price_level`, and `website`.

**Popular Times** (server-side) — the `current_opening_hours` response includes `secondary_opening_hours` and busyness data for each hour of the week. The orchestrator extracts the busyness percentages for the specific travel day and classifies each hour as `low` (< 30%), `moderate` (30–70%), or `high` (> 70%). This drives the `crowdLevel` and `optimalVisitWindow` fields on each stop.

The `opening_hours.periods` array is the critical input that prevents the AI from scheduling closed venues. The orchestrator converts the raw periods into a human-readable summary per travel day before embedding in the prompt.

**Caching strategy**: Place details are cached in S3 with a 24-hour TTL. Popular destinations will almost never result in a live API call after the first user plans a trip there.

### Google Directions API (Transit Mode)

Rather than computing a simple point-to-point distance matrix, the orchestrator calls the Directions API with `mode=transit` for each consecutive stop pair. The response returns the full recommended leg sequence — e.g. *"walk 4 min to Cité station → Métro Line 4 towards Montrouge (6 min) → walk 3 min to destination"* — which is stored as an array of `TransitLeg` objects and surfaced verbatim in the `StopCard` transport block.

For walking-zone transitions (where city config marks the area as `walkingZone: true`), the orchestrator calls with `mode=walking` instead and returns a single-leg walk instruction with distance and estimated duration.

For cities with no reliable transit API coverage, the orchestrator falls back to the Distance Matrix API for duration estimates and prompts the AI to generate generic transit instructions based on the city's known transport network.

The full leg data per stop pair is cached in S3 per `(originPlaceId, destPlaceId, mode, date)` key with a 6-hour TTL.

### OpenWeatherMap API (One Call 3.0)

A single API call retrieves an 8-day hourly forecast for the destination's coordinates. The orchestrator extracts the daily summary for each travel date: `weather[0].main` (e.g. "Rain", "Clear"), `temp.max`, `temp.min`, `pop` (probability of precipitation), and `uvi`.

This is passed to the AI per travel day with explicit scheduling instructions:

- If `pop > 0.6`: deprioritise outdoor-primary stops (parks, viewpoints, walking tours, open-air markets); schedule indoor alternatives and retain the deferred outdoor stops in a `deferred` list for redistribution to forecast-clear days
- If `uvi > 7`: schedule outdoor stops before 11:00 or after 16:00
- If `weather[0].main === "Storm"`: flag the day for a full replan regardless of other constraints

The weather-reactive replanning threshold is configurable per user via `weatherSensitivity: "low" | "medium" | "high"` (see Section 2). At `low`, only `pop > 0.8` triggers indoor substitution. At `high`, `pop > 0.4` is sufficient.

### Google Places Nearby Search (Restaurant Candidates)

For each day's plan, the orchestrator identifies the geographic midpoint of the morning and afternoon stop clusters and calls the Nearby Search API with `type=restaurant`, filtered by: minimum rating `4.0`, price level matching the user's budget tier, and optionally cuisine preference from the user's profile. The top 3 results per meal slot are returned and embedded in the prompt. The AI selects the one best positioned along that day's route, minimising detour distance.

### AWS Bedrock (Claude claude-sonnet-4-6)

All AI inference runs through AWS Bedrock rather than calling the Anthropic API directly. This keeps all network traffic within AWS, uses IAM for authentication (no API key management), and provides native CloudWatch integration for monitoring token usage and latency.

The model used is `anthropic.claude-sonnet-4-6` — a strong balance of reasoning quality and speed for structured output tasks.

Two invocation patterns:

**Plan generation** — a large structured prompt (see Section 9) with `max_tokens: 4096`. The response is a JSON object containing an array of day plans.

**Conversational refinement** — a multi-turn conversation format with the existing plan as a system context block and the user's message as the latest human turn. `max_tokens: 1024`. The response is a JSON diff object.

---

## 8. React Native Frontend

### Project Structure

```
/app
  /(auth)
    login.tsx
    register.tsx
  /(tabs)
    index.tsx          # Home — list of saved trips
    create.tsx         # New trip creation flow
    profile.tsx
  /trip
    [tripId].tsx       # Trip detail + itinerary view
    [tripId]/chat.tsx  # Conversational refinement
    [tripId]/map.tsx   # Full-screen map view
/components
  /trip
    DayCard.tsx        # Single day's itinerary
    StopCard.tsx       # Individual stop within a day
    PlanSkeleton.tsx   # Loading skeleton during generation
  /ui
    Button.tsx
    Input.tsx
    Sheet.tsx          # Bottom sheet wrapper
/hooks
  useTrip.ts           # React Query hooks for trip data
  useChat.ts           # Chat/refinement state
  usePushNotifications.ts
/stores
  authStore.ts         # Zustand — Cognito session
  uiStore.ts
/lib
  api.ts               # Axios instance + interceptors
  cognito.ts           # Auth helpers
  constants.ts
```

### Key Screens

**Trip Creation (Multi-Step Form)**

A 4-step bottom-sheet flow:
1. Destination and dates
2. Accommodation addresses per stay segment
3. Attractions — searchable list with Google Places Autocomplete; drag to reorder; toggle "must-do" flag
4. Preferences — transport mode (multi-select), pace, budget, accessibility

On submission, the form data is posted to `POST /trips`. The app navigates to the trip detail screen immediately, which renders a skeleton loader while polling for `status === "ready"`.

**Itinerary Viewer**

A vertically scrolling screen with a sticky day selector at the top (horizontal scroll of date pills). Each day renders as a `DayCard` containing an ordered list of `StopCard` components. Each `StopCard` shows: stop name, category icon, time slot, duration estimate, and a thumbnail from Google Places Photos. Tapping a stop opens a bottom sheet with full details and edit options.

A floating action button opens the chat refinement panel — a standard chat UI pre-seeded with the trip context. The user types natural language edits; updates are reflected in the itinerary within seconds.

**Map View**

Full-screen `react-native-maps` view showing all stops for the selected day as numbered markers, connected by a polyline representing the recommended route. Tapping a marker shows the stop's details in a bottom card.

---

## 9. AI & Prompt Engineering

### Plan Generation Prompt Structure

The system prompt sent to Claude has four sections:

**Role definition**: Claude is instructed to act as an expert travel planner with deep knowledge of logistics, local customs, and visitor experience optimisation. It is told to prioritise executability — every plan must be physically possible on the given day.

**Hard constraints**: A structured list of rules the model must not violate:
- Never schedule a stop at a venue that is closed on that day of the week
- Never schedule consecutive outdoor stops if `precipitationProbability > 0.6`
- Respect the user's must-do date assignments
- Ensure travel time between consecutive stops (from the transit leg data) plus stop duration plus a 10-minute buffer does not cause a schedule overflow
- Always insert a meal stop within 4 hours of the previous meal stop; never end a day without a dinner stop
- For crowd-sensitive venues, schedule before 10:00 or after 15:30 unless no other slot is available; if scheduled at peak time, apply a +40% duration estimate

**Contextual data block**: Structured JSON containing the attraction list with opening hours, Popular Times crowd data by hour and day of week, full transit leg sequences per stop pair, nearby restaurant candidates per route segment, the weather forecast per day with precipitation probability, accommodation addresses, the city's transport configuration (walk zones, transit lines, peak hours), the user's preferences, and the stated daily budget.

**Output format instruction**: The model is instructed to return a JSON object strictly conforming to the `TripPlan` schema (defined in the prompt using a TypeScript-style type definition). Any deviation from the schema causes the orchestrator to reject the response and retry with a clarifying follow-up message (up to 2 retries).

### "Surprise Me" Pre-Planning Prompt

When Surprise Me mode is enabled, the orchestrator sends a separate, lightweight Bedrock call before the main generation. The prompt provides: the destination city, the user's explicit attraction list (so the model avoids suggesting overlapping themes), the route's geographic bounds (computed from the anchor stop coordinates), and the constraint that suggestions must feel genuinely local and non-obvious.

The model returns a structured list of candidates. The orchestrator then filters them server-side: cross-references `placeId` against the city popularity blocklist in S3, verifies Google Places rating ≥ 4.2 and review count ≥ 50, and confirms the place is within 800m of the planned route using a simple haversine distance check. Passing candidates are injected into the main planning prompt marked as `stopType: "ai_suggested"` with `isOptional: true`.

### Conversational Refinement Prompt Structure

The system prompt for refinement includes the current plan as a JSON block and instructs the model to:
- Return only a JSON diff object (an array of change operations: `{ op: "move" | "replace" | "remove" | "add", target: ..., value: ... }`)
- Never return the full plan
- Explain each change in a short `reason` field within the diff object

The diff is applied by the Lambda using a custom JSON patch utility, producing the new plan version which is then stored in DynamoDB.

---

## 10. Data Models

### DynamoDB Single Table

```
PK                    SK                    Attributes
──────────────────────────────────────────────────────────────────
USER#<userId>         PROFILE               email, name, locale, preferences
USER#<userId>         TRIP#<tripId>         tripName, destination, startDate, endDate, status, createdAt
TRIP#<tripId>         META                  userId, inputPayload (attractions, prefs, stays)
TRIP#<tripId>         PLAN#CURRENT          planJson, generatedAt, version
TRIP#<tripId>         PLAN#<versionId>      planJson, generatedAt, changeReason
TRIP#<tripId>         CHAT#<messageId>      role, content, timestamp
WS#<connectionId>     CONN                  userId, connectedAt, ttl
```

GSI1: `GSI1PK = DATE#<travelDate>`, `GSI1SK = TRIP#<tripId>` — enables the morning Lambda to query all trips active on a given date.

### Trip Plan JSON Schema (abbreviated)

```typescript
type TripPlan = {
  tripId: string;
  generatedAt: string;           // ISO 8601
  version: number;
  totalBudgetEstimateUSD: number;
  days: DayPlan[];
};

type DayPlan = {
  date: string;                  // YYYY-MM-DD
  dayNumber: number;
  weatherSummary: string;        // e.g. "Partly cloudy, high 18°C"
  precipitationProbability: number; // 0.0 – 1.0
  narrative: string;             // 2-3 sentence AI intro for the day
  budgetBreakdown: {
    entranceFees: number;
    transport: number;
    meals: number;
    discretionary: number;
    total: number;
    currency: string;
    transitPassRecommended: boolean; // true if day pass is cheaper than singles
  };
  stops: Stop[];
};

type Stop = {
  placeId: string;
  name: string;
  category: "food" | "culture" | "nature" | "shopping" | "transit" | "accommodation" | "break";
  stopType: "user_requested" | "ai_suggested" | "meal" | "rest_break";
  isOptional: boolean;           // true for rest breaks and surprise stops
  arrivalTime: string;           // HH:MM
  departureTime: string;         // HH:MM
  durationMinutes: number;
  optimalVisitWindow: string;    // e.g. "Before 10:00 or after 15:30"
  crowdLevel: "low" | "moderate" | "high"; // at scheduled time
  entranceFeeUSD: number | null;
  transportFromPrevious: {
    mode: "walk" | "drive" | "transit" | "cycle";
    durationMinutes: number;
    distanceKm: number;
    costUSD: number;
    legs: TransitLeg[];          // empty for walk/drive
  } | null;
  notes: string;                 // AI-generated tip for this stop
  surpriseMeReason: string | null; // populated for ai_suggested stops
  coordinates: { lat: number; lng: number };
};

type TransitLeg = {
  instruction: string;           // e.g. "Take Line 4 towards Montrouge"
  departureStop: string;
  arrivalStop: string;
  durationMinutes: number;
  line: string | null;           // e.g. "Métro Line 4"
};
```

---

## 11. API Reference

### `POST /trips`

Creates a new trip and enqueues plan generation.

**Request body**
```json
{
  "name": "Tokyo Spring 2026",
  "destination": {
    "city": "Tokyo",
    "country": "JP",
    "coordinates": { "lat": 35.6762, "lng": 139.6503 }
  },
  "startDate": "2026-04-01",
  "endDate": "2026-04-07",
  "stays": [
    {
      "fromDate": "2026-04-01",
      "toDate": "2026-04-07",
      "address": "Shinjuku, Tokyo",
      "coordinates": { "lat": 35.6938, "lng": 139.7036 }
    }
  ],
  "attractions": [
    {
      "placeId": "ChIJ51cu8IcbXWARiRtXIothAS4",
      "name": "Senso-ji Temple",
      "mustDoDate": null
    }
  ],
  "preferences": {
    "transportModes": ["walk", "transit"],
    "pace": "moderate",
    "budgetPerDayUSD": 150,
    "accessibilityRequirements": []
  }
}
```

**Response** `202 Accepted`
```json
{
  "tripId": "trip_01HX...",
  "status": "pending"
}
```

### `GET /trips/{tripId}`

Returns the trip including the current plan if generated.

**Response** `200 OK`
```json
{
  "tripId": "trip_01HX...",
  "name": "Tokyo Spring 2026",
  "status": "ready",
  "plan": { ... }
}
```

### `POST /trips/{tripId}/chat`

Sends a refinement message.

**Request body**
```json
{
  "message": "Move Senso-ji Temple to day 3 morning and replace it on day 1 with something nearby"
}
```

**Response** `200 OK`
```json
{
  "reply": "Done — I've moved Senso-ji Temple to the morning of April 3rd and added Ueno Park as a replacement for day 1. The timing works well given the temple opens at 06:00.",
  "planUpdated": true,
  "newVersion": 3
}
```

---

## 12. Security Design

### Authentication & Authorisation

All API endpoints require a valid Cognito JWT. API Gateway validates the token signature on every request before invoking Lambda. Lambda functions additionally verify `event.requestContext.authorizer.jwt.claims.sub` matches the `userId` in the request path or body — preventing one user from accessing another's trips.

### API Key Management

All third-party API keys are stored exclusively in AWS Secrets Manager. Lambda functions resolve secrets at cold start and cache them in memory for the lifetime of the execution environment. Keys are never logged, never passed as environment variables, and never included in CDK outputs.

### Principle of Least Privilege

Each Lambda function has its own IAM execution role. Roles are scoped to the minimum required:
- Trip CRUD Lambda: `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:UpdateItem`, `dynamodb:Query` on the trips table only; `sqs:SendMessage` on the plan-generation-queue only
- Plan Orchestrator Lambda: `dynamodb:PutItem`, `dynamodb:UpdateItem`; `s3:GetObject`, `s3:PutObject` on the cache bucket; `bedrock:InvokeModel` on the Claude model ARN only

### Input Validation

All API inputs are validated with Zod schemas at the Lambda handler level before any downstream calls are made. Validation errors return `400 Bad Request` with structured error messages. AI output is also validated with Zod against the `TripPlan` schema — if the model returns malformed JSON or a schema mismatch, the orchestrator retries up to 2 times with a corrective follow-up before marking the plan as failed.

### Data Isolation

DynamoDB access patterns are designed so that every read and write is scoped by `userId`. The GSI used by the morning Lambda is read-only within that Lambda's role. No Lambda can perform a full table scan.

---

## 13. Getting Started

### Prerequisites

- Node.js 20+
- AWS CLI configured with appropriate credentials
- AWS CDK CLI: `npm install -g aws-cdk`
- Expo CLI: `npm install -g expo-cli`
- Google Cloud project with Places API and Directions API enabled
- OpenWeatherMap account (One Call 3.0 plan)
- Expo account (for push notifications)

### Clone & Install

```bash
git clone https://github.com/your-username/wayfarer.git
cd wayfarer

# Install backend dependencies
cd infrastructure && npm install
cd ../backend && npm install

# Install frontend dependencies
cd ../mobile && npm install
```

### Environment Setup

```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "wayfarer/google-places-api-key" \
  --secret-string "YOUR_KEY"

aws secretsmanager create-secret \
  --name "wayfarer/openweather-api-key" \
  --secret-string "YOUR_KEY"
```

Create `mobile/.env`:
```
EXPO_PUBLIC_API_BASE_URL=https://your-api-gateway-url.execute-api.eu-west-1.amazonaws.com
EXPO_PUBLIC_COGNITO_USER_POOL_ID=eu-west-1_XXXXXX
EXPO_PUBLIC_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
EXPO_PUBLIC_GOOGLE_PLACES_KEY=YOUR_KEY_FOR_CLIENT_AUTOCOMPLETE
```

### Deploy Infrastructure

```bash
cd infrastructure
cdk bootstrap   # First time only
cdk deploy --all
```

### Run Mobile App Locally

```bash
cd mobile
npx expo start
```

Scan the QR code with Expo Go on your device, or press `i` for iOS simulator / `a` for Android emulator.

---

## 14. Deployment

### Infrastructure as Code

All AWS resources are defined using AWS CDK in the `/infrastructure` directory. The CDK app defines three stacks:

**`WayfarerAuthStack`** — Cognito User Pool, User Pool Client, identity pool configuration.

**`WayfarerApiStack`** — API Gateway (HTTP + WebSocket), all Lambda functions, SQS queues, DLQs, EventBridge rule, SNS topic, ElastiCache cluster, Secrets Manager references, IAM roles.

**`WayfarerDataStack`** — DynamoDB table with GSI, S3 buckets, CloudWatch dashboard and alarms.

### CI/CD (Recommended)

GitHub Actions workflow:
1. On push to `main`: run `tsc --noEmit` and `jest` across backend and infrastructure
2. On merge to `main`: `cdk diff` output posted as a PR comment; `cdk deploy --all` on approval
3. Expo EAS Build triggered for mobile: `eas build --platform all` on tagged releases

### Environments

Three environments: `dev`, `staging`, `prod`. CDK stack names are suffixed by environment. Environment is passed as a CDK context variable: `cdk deploy --context env=prod`.

---

## 15. Future Roadmap

### v1.1 — Collaborative Planning
- Invite travel companions to a trip via email
- Role-based access: Owner (full edit), Collaborator (can suggest changes), Viewer (read-only)
- Real-time collaborative editing using DynamoDB Streams + WebSocket broadcasts

### v1.2 — Booking Integration
- Deep links to booking partners (GetYourGuide, Booking.com, Trainline) for each attraction and accommodation
- Price context surfaced inline on stop cards ("Entry: ~€14")

### v1.3 — Offline Mode
- Full itinerary available offline via React Native MMKV storage
- Offline-first architecture with sync on reconnect
- Downloadable city maps via MapLibre

### v1.4 — Social & Discovery
- Public trip library: browse and clone itineraries created by other users
- Upvote/review system for community-curated plans
- "Trips like mine" recommendation engine based on destination and preference similarity

### v2.0 — Proactive AI Companion
- Continuous monitoring during the trip: detects when the user is running behind schedule (via location) and automatically re-optimises the remaining day
- Conversational Q&A about any stop ("What should I order here?", "Is this area safe at night?")
- Post-trip reflection: AI-generated trip summary with photos, stats, and highlights ready to share

---

## Acknowledgements

Architecture and product design by Yi Zheng. Built as a portfolio project demonstrating full-stack mobile development with AWS serverless infrastructure and LLM integration.

---

*Last updated: March 2026 — v1.1 feature additions: time-aware planning, transport-mode intelligence, meal/break slots, budget awareness, weather-reactive replanning, Surprise Me mode*
