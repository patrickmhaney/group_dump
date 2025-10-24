# Group Dump - User Flow Quick Reference

## Key File Locations

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Landing Page | `src/App.tsx` | Route configuration, auth context |
| Login | `src/components/Login.tsx` | Email/password authentication |
| Registration | `src/components/Register.tsx` | User signup, basic info collection |
| Company Browsing | `src/components/Groups.tsx` (Step 2) | Service selection in multi-step form |
| Company Management | `src/components/Companies.tsx` | Company registration/editing |
| User Profile | `src/components/UserProfile.tsx` | Update address, zipcode |
| Backend | `main.py` | All API endpoints and business logic |

## User Journey Map

```
UNAUTHENTICATED
      ↓
   /login or /register
      ↓
AUTHENTICATED
      ├─→ Renter (user_type='renter')
      │    ↓
      │    /groups (main page)
      │    ↓
      │    Click "Create Group"
      │    ↓
      │    Step 1: Basic Info (group name, address, max members)
      │    ↓
      │    Step 2: SERVICE SELECTION ← COMPANY BROWSING HAPPENS HERE
      │    ├─ GET /companies (with proximity_filter=true)
      │    ├─ Backend filters by user location
      │    └─ Display nearby companies with pricing
      │    ↓
      │    Step 3-5: Invites, Dates, Payment
      │
      ├─→ Company (user_type='company')
      │    ↓
      │    /companies (main page)
      │    ↓
      │    Register/Manage own company
      │
      └─→ Admin (email='service.account.dc@groupdump.com')
           ↓
           /admin (admin dashboard)
```

## API Endpoints for Company Browsing

### GET /companies
**Purpose:** Fetch companies (filtered or full list)
**Auth:** Required (JWT token)
**Parameters:**
- `proximity_filter` (bool, default=true) - Enable location-based filtering
- `skip` (int, default=0) - Pagination
- `limit` (int, default=100) - Pagination

**Response:**
- For renters: All companies (filtered to ~50 miles if proximity_filter=true)
- For companies: Only their own companies
- List includes: name, contact, address, dumpster_sizes, google_rating

### GET /companies/{company_id}
**Purpose:** Get detailed company info
**Auth:** Required (JWT token)
**Response:** Single company object with all details

## Authentication Flow

```
Client Login                  Server
   ↓                           ↓
POST /token
(email, password)  ──────────→ Validate credentials
                               Generate JWT token
                   ←────────── Return: {access_token, token_type}
   ↓
GET /users/me
(Bearer token)     ──────────→ Validate JWT
                               Lookup user
                   ←────────── Return: User object
   ↓
Store token in localStorage
   ↓
Set Authorization header for all future requests
```

## Location-Based Filtering Logic

```
User Registers/Updates Profile
   ↓
Address geocoded using OpenStreetMap Nominatim
   ↓
Coordinates stored: user.latitude, user.longitude
   ↓
When fetching companies:
   ├─ If user has coordinates:
   │  └─ Calculate Haversine distance to each company
   │     └─ Filter: distance ≤ 50 miles
   │
   └─ Else if user has ZIP code:
      └─ Calculate ZIP distance approximation
         └─ Filter: distance ≤ 50 miles
```

## Authorization Rules

| Operation | Who Can Access | Notes |
|-----------|----------------|-------|
| View /login | Anyone | Redirects authenticated users |
| View /register | Anyone | Creates new user account |
| View /groups | Renters only | Multi-step group creation |
| View /companies | Companies only | Company management |
| GET /companies | Any authenticated | Filtered by user type |
| GET /companies/{id} | Any authenticated | No authorization check |
| POST /companies | Company users only | Register new company |
| PUT /companies/{id} | Owner or admin | Must be created_by or admin |
| DELETE /companies/{id} | Owner or admin | Must be created_by or admin |
| View /admin | Admin only | email='service.account.dc@groupdump.com' |
| PUT /users/me | Own user only | Update own profile |

## Data Flow for Company Filtering

```
FRONTEND (Groups.tsx)
├─ useEffect on mount
├─ Call fetchCompanies()
│  ├─ GET /companies?proximity_filter=true
│  └─ Set companies state with response
├─ Render Step 2 (Service Selection)
└─ Display company list

BACKEND (main.py:1695)
├─ GET /companies endpoint
├─ Validate user token (get_current_user)
├─ If user_type='company':
│  └─ Query only companies where created_by=user.id
├─ Else (renter):
│  ├─ Query all companies
│  ├─ If proximity_filter=true:
│  │  ├─ If user has coordinates:
│  │  │  └─ filter_companies_by_actual_distance()
│  │  │     └─ Haversine formula
│  │  └─ Else if user has ZIP:
│  │     └─ filter_companies_by_proximity()
│  │        └─ ZIP prefix comparison
│  └─ Return filtered list
└─ Return response
```

## Key Data Fields

### For Proximity Filtering
- **User.latitude** - User's geocoded latitude
- **User.longitude** - User's geocoded longitude
- **User.zip_code** - User's ZIP code (fallback for filtering)
- **Company.latitude** - Company's geocoded latitude
- **Company.longitude** - Company's geocoded longitude
- **Company.zip_code** - Company's ZIP code (fallback for filtering)

### For Authorization
- **User.user_type** - "renter" or "company"
- **User.email** - Email address (checked for admin)
- **Company.created_by** - User ID that created the company

### For Display
- **Company.name** - Display name
- **Company.dumpster_sizes** - JSON string with pricing options
- **Company.google_rating** - Rating from Google Places
- **Company.google_user_ratings_total** - Review count

## Distance Calculation Methods

### Method 1: Haversine (Accurate)
- Used when both user and company have coordinates
- Accuracy: ~0.1% for typical US distances
- Used: For proximity filtering in GET /companies

### Method 2: ZIP Approximation (Fallback)
- Compares first 3 digits of ZIP codes
- Distance = function(difference between prefixes)
- Used when coordinates unavailable
- Provides basic ~50 mile radius filtering

## Important Constraints

1. **Proximity Filter Always Active for Groups**
   - Groups.tsx line 467: Always requests `proximity_filter=true`
   - Cannot be disabled from Group creation
   
2. **Companies.tsx Has Toggle**
   - Renters can toggle "Show Nearby Only" / "Show All Companies"
   - Company users don't see this toggle
   
3. **50 Mile Radius**
   - Hard-coded maximum distance for proximity filtering
   - Both Haversine and ZIP methods use this limit
   
4. **No Address Validation**
   - Addresses not validated against USPS
   - Geocoding may fail for invalid addresses
   - Fallback to ZIP approximation if geocoding fails

## Testing Quick Checklist

- [ ] Login creates JWT token
- [ ] Token stored in localStorage
- [ ] Token included in API requests
- [ ] Unauthenticated requests return 401
- [ ] Company list filtered by user location
- [ ] Zipcode update triggers re-geocoding
- [ ] Company users see only own companies
- [ ] Renters see all nearby companies
- [ ] Admin can access all endpoints
- [ ] Profile update calculates new coordinates
