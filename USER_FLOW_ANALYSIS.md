# Group Dump - Current User Flow Analysis

## Overview
This document describes the current user flow for browsing dumpster companies and service selection in the Group Dump application.

---

## 1. MAIN/LANDING PAGE

**File Location:** `/home/patrickmhaney/group_dump/src/App.tsx`

**Implementation:**
- The landing/root page is implemented using React Router with a `<Router>` component
- Route `/` redirects authenticated users based on their user type:
  - Admin users (service.account.dc@groupdump.com) → `/admin`
  - Renters (user_type='renter') → `/groups`
  - Companies (user_type='company') → `/companies`
- Unauthenticated users are redirected to `/login`

**Code Reference:**
```typescript
<Route path="/" element={<Navigate to={user ? (user.email === 'service.account.dc@groupdump.com' ? "/admin" : (user.user_type === 'renter' ? "/groups" : "/companies")) : "/login"} />} />
```

---

## 2. LOGIN FLOW

**File Location:** `/home/patrickmhaney/group_dump/src/components/Login.tsx`

**Implementation:**
- Route: `/login`
- Styled landing page with "Group Dump" branding
- Form collects: email and password
- Error handling for invalid credentials
- Link to register page with optional redirect query parameter

**Key Features:**
- Login form submits to `/token` endpoint
- Gets access token and user data from `/users/me` endpoint
- Supports redirect parameter: `?redirect=/path` to redirect after login
- Displays "How It Works" guide with three user personas (Group Creator, Group Member, Dumpster Provider)

**Backend Endpoints Used:**
```
POST /token
- Accepts: OAuth2PasswordRequestForm (username, password)
- Returns: { access_token, token_type }

GET /users/me
- Requires: Bearer token
- Returns: User object with all profile info
```

**Authentication Flow:**
```
main.py:876-889
@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Validates email/password
    # Returns JWT token
```

---

## 3. REGISTRATION / BASIC INFO PAGE

**File Location:** `/home/patrickmhaney/group_dump/src/components/Register.tsx`

**Implementation:**
- Route: `/register`
- Collects comprehensive user information during signup:
  - Email
  - Full Name
  - Phone Number
  - Address (street)
  - City
  - State
  - ZIP Code (5-digit validation)
  - User Type (dropdown: "Dumpster Renter" or "Dumpster Company")
  - Password
  - Confirm Password

**Key Features:**
- Form validation ensures passwords match
- Supports redirect query parameter: `?redirect=/path`
- After registration, automatically logs user in
- Routes to appropriate landing page based on user_type

**Backend Endpoint:**
```
POST /register
- Accepts: UserCreate (email, name, phone, address, city, state, zip_code, password, user_type)
- Returns: UserResponse
```

**Registration Backend Logic (main.py:847-874):**
```python
@app.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    # Geocodes address using OpenStreetMap Nominatim API
    # Stores coordinates (latitude, longitude) for location-based filtering
    # Creates User record with hashed password
```

**Geocoding:**
- Uses OpenStreetMap Nominatim API (free, no API key required)
- Converts address to GPS coordinates for proximity-based company filtering
- Falls back to zipcode approximation if geocoding fails

---

## 4. SERVICE SELECTION / DUMPSTER COMPANY BROWSING

**File Location:** `/home/patrickmhaney/group_dump/src/components/Groups.tsx`

**Implementation:**
The service selection is integrated into the Group creation multi-step form (Step 2: Service):

**Flow:**
1. User clicks "Create Group" button
2. Multi-step form progresses through:
   - Step 1: Basic Info (group name, address, max participants)
   - **Step 2: Service Selection** (company browsing)
   - Step 3: Invitations
   - Step 4: Dropoff Dates
   - Step 5: Payment Method

**Service Selection UI (Groups.tsx:1280+):**
- Companies are loaded on component mount via `fetchCompanies()`
- Displays filtered companies based on user's location
- Shows company details:
  - Name, Email, Phone, Address, City, State, ZIP
  - Website link
  - Service Areas
  - Dumpster sizes with pricing
  - Google rating and review count (if available)

**Company List Display:**
- For each company shown, displays:
  - Company name (prominent)
  - Contact information
  - Service areas (comma-separated)
  - Dumpster options with details:
    - Cubic yards
    - Dimensions
    - Starting price
    - Starting tonnage
    - Per-ton overage price
    - Additional day price
  - Google rating (with star icon and review count)

---

## 5. ZIPCODE ENTRY & COMPANY FILTERING

**File Location:** 
- Frontend: `/home/patrickmhaney/group_dump/src/components/Groups.tsx` (fetchCompanies function)
- Backend: `/home/patrickmhaney/group_dump/main.py`

### Frontend Zipcode Handling:

**Entry Point:** During user registration (Register.tsx) or profile update (UserProfile.tsx)
- Zipcode collected with regex validation: `[0-9]{5}(-[0-9]{4})?` (5-digit or ZIP+4 format)
- Zipcode stored in User object: `user.zip_code`

**Geocoding (main.py:464-498):**
```python
async def geocode_address(address: str, city: str, state: str, zip_code: str) -> Optional[Tuple[float, float]]:
    # Called during registration and profile update
    # Uses OpenStreetMap Nominatim API
    # Returns: (latitude, longitude) or None
    # Stores coordinates in User record for accurate distance calculation
```

### Backend Company Filtering:

**GET /companies Endpoint (main.py:1695-1732):**

```python
@app.get("/companies", response_model=list[CompanyResponse])
async def get_companies(
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    proximity_filter: bool = True,
    db: Session = Depends(get_db)
):
    # Behavior depends on user_type:
    
    # FOR COMPANY USERS:
    # - Only returns their own companies (created_by == current_user.id)
    
    # FOR RENTER USERS:
    # - Returns all companies in database
    # - Applies proximity filtering based on proximity_filter parameter
    
    # PROXIMITY FILTERING (for renters):
    if proximity_filter and current_user.latitude and current_user.longitude:
        # Uses accurate geographic distance (Haversine formula)
        # Filters to companies within 50 miles (default)
        companies = await filter_companies_by_actual_distance(
            companies,
            current_user.latitude,
            current_user.longitude,
            user_zip=current_user.zip_code
        )
    elif proximity_filter and current_user.zip_code:
        # Fallback: approximate distance using ZIP code prefixes
        companies = filter_companies_by_proximity(
            companies,
            current_user.zip_code,
            max_distance=50
        )
```

**Distance Calculation Methods:**

### 1. Geographic Distance (Haversine Formula) (main.py:614-623):
```python
def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate actual geographic distance in miles using Haversine formula"""
    # Accurate to ~0.1% for typical US distances
    # Used when both user and company have geocoded coordinates
```

### 2. ZIP Code Approximation (main.py:423-448):
```python
def calculate_zip_distance_approximation(zip1: str, zip2: str) -> float:
    """
    Approximate distance using first 3 digits of ZIP code
    - Same prefix (e.g., both start with "201") = 0 miles
    - Different by 1 = 25 miles
    - Different by 2-3 = 30 * difference miles
    - Larger difference = 50 * difference miles
    """
    # Used when coordinates unavailable
    # Provides basic proximity filtering
```

**Proximity Filter Toggle:**
- Groups.tsx (line 467): Hardcoded to always request `proximity_filter: true`
- UI Toggle in Companies.tsx (line 474-483): 
  - Renter users can toggle between "Show Nearby Only" and "Show All Companies"
  - Company users don't see this toggle

---

## 6. AUTHENTICATION & AUTHORIZATION CHECKS

### Core Authentication Function (main.py:820-836):

```python
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Validates JWT token and returns authenticated user
    - Extracts email from JWT payload
    - Queries database for user
    - Raises 401 if token invalid or user not found
    """
```

### Token Management:
- **Generation:** On login, creates JWT with user email in 'sub' claim
- **Expiration:** 30 minutes (ACCESS_TOKEN_EXPIRE_MINUTES)
- **Storage:** Stored in localStorage on client
- **Transmission:** Bearer token in Authorization header: `Authorization: Bearer {token}`
- **Validation:** JWT signature verified using SECRET_KEY and HS256 algorithm

### Authorization Checks for Company Browsing:

**1. Basic Authentication (Required):**
- ALL endpoints require valid JWT token via `Depends(get_current_user)`
- If token invalid/missing → 401 Unauthorized

**2. GET /companies Route Authorization (main.py:1697-1711):**
```python
if current_user.user_type == "company":
    # Company users: Only see their own companies
    companies = db.query(Company).filter(Company.created_by == current_user.id).all()
else:
    # Renter users: See all companies (filtered by proximity)
    companies = db.query(Company).all()  # Then proximity filter applied
```

**3. GET /companies/{company_id} Route (main.py:1734-1757):**
- NO special authorization check
- Any authenticated user can view any company's details
- Used for detailed company information

**4. Company Management Operations (main.py:1786+):**
```python
# Update company (PUT /companies/{company_id})
if current_user.user_type == "company" and company.created_by != current_user.id:
    raise HTTPException(status_code=403, detail="You can only edit companies you created")

# Delete company
if current_user.user_type == "company" and company.created_by != current_user.id:
    raise HTTPException(status_code=403, detail="You can only delete companies you created")
```

**5. Admin-Only Operations (main.py:838-845):**
```python
async def get_admin_user(current_user: User = Depends(get_current_user)):
    """Verify user is the admin account"""
    if current_user.email.lower() != "service.account.dc@groupdump.com".lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )
```

### Frontend Route Protection (App.tsx:77-80):

```typescript
// Companies route: Protected by user type
<Route path="/companies" element={
    user ? (
        user.email === 'service.account.dc@groupdump.com' || user.user_type === 'company'
            ? <Companies />
            : <Navigate to="/groups" />
    ) : <Navigate to="/login" />
} />

// Groups route: Protected by user type
<Route path="/groups" element={
    user ? (
        user.user_type === 'renter'
            ? <Groups />
            : <Navigate to="/companies" />
    ) : <Navigate to="/login" />
} />
```

---

## 7. USER PROFILE/ZIPCODE UPDATE

**File Location:** `/home/patrickmhaney/group_dump/src/components/UserProfile.tsx`

**Implementation:**
- Route: `/profile`
- Allows users to update their information
- Form fields mirror registration:
  - Name, Phone, Address, City, State, ZIP Code

**Backend Endpoint:**
```
PUT /users/me
- Requires: Bearer token
- Accepts: UserUpdateRequest (name, phone, address, city, state, zip_code)
- Returns: Updated User object
- Side Effect: Re-geocodes address for proximity-based filtering
```

**Zipcode Update Impact:**
- When zipcode is updated, user's coordinates are recalculated via geocoding
- Next company fetch will use updated coordinates for proximity filtering
- If geocoding fails, falls back to zip-based approximation

---

## 8. DATA MODEL - KEY FIELDS

### User Table (main.py:133-151):
```python
class User(Base):
    id: Integer (primary key)
    email: String (unique, indexed)
    name: String
    phone: String
    address: String
    city: String
    state: String
    zip_code: String
    latitude: Float (nullable) - Geocoded coordinate
    longitude: Float (nullable) - Geocoded coordinate
    geocoded_at: DateTime (nullable) - When coordinates were last updated
    hashed_password: String
    user_type: String (default="renter") - "renter" or "company"
    created_at: DateTime
```

### Company Table (main.py:185-212):
```python
class Company(Base):
    id: Integer (primary key)
    name: String
    email: String
    phone: String
    address: String
    city: String
    state: String
    zip_code: String (required) - Used for filtering
    latitude: Float (nullable) - Geocoded coordinate
    longitude: Float (nullable) - Geocoded coordinate
    geocoded_at: DateTime (nullable)
    website: String
    service_areas: Text (nullable)
    dumpster_sizes: Text - JSON string of pricing options
    commission_rate: Float (default=0.08)
    rating: Float (default=0.0)
    google_place_id: String (nullable) - For Google Places API
    google_rating: Float (nullable) - From Google Places
    google_user_ratings_total: Integer (nullable) - Review count
    google_rating_updated_at: DateTime (nullable)
    created_by: Integer (Foreign Key to User) - Company owner
    created_at: DateTime
```

---

## 9. CURRENT FLOW SEQUENCE DIAGRAM

```
User (Not Logged In)
    ↓
1. Visits site → Redirected to /login
    ↓
2. Option A: Login with existing credentials
   - Submits email/password
   - POST /token → Get JWT
   - GET /users/me → Get user object
   - Context saved to localStorage
    ↓
   Option B: Register new account
   - Navigate to /register
   - Fill in all fields including ZIP
   - POST /register → Create user, geocode address
   - Automatic login (POST /token, GET /users/me)
    ↓
3. Authenticated - Routed based on user_type
    ├─ user_type='renter' → /groups
    │   ├─ User can create groups (multi-step form)
    │   ├─ Step 2: Service Selection
    │   │   ├─ GET /companies (proximity_filter=true)
    │   │   ├─ Backend filters by user coordinates or ZIP
    │   │   └─ Displays nearby companies
    │   └─ User can toggle proximity filter
    │
    ├─ user_type='company' → /companies
    │   ├─ User can register/edit their company
    │   ├─ GET /companies returns only their companies
    │   └─ Can manage company details and pricing
    │
    └─ email='service.account.dc@groupdump.com' → /admin
        └─ Admin dashboard access

4. Optional: Update profile (/profile)
    - PUT /users/me with updated address
    - Triggers re-geocoding
    - Next company filter uses new coordinates
```

---

## 10. COMPONENT HIERARCHY

```
App.tsx (Main Router)
├── Login.tsx (Route: /login)
├── Register.tsx (Route: /register)
├── Groups.tsx (Route: /groups) - RENTER USER MAIN PAGE
│   ├── VendorDetails (embedded component)
│   ├── ServiceConfirmation.tsx (modal)
│   ├── ServiceOrderSummary.tsx (modal)
│   └── Companies display embedded in Step 2
├── Companies.tsx (Route: /companies) - COMPANY USER MAIN PAGE
│   └── Company management UI
├── UserProfile.tsx (Route: /profile)
├── Admin.tsx (Route: /admin) - ADMIN ONLY
├── Join.tsx (Route: /join/:token) - Public invitee join
└── PaymentRequestDashboard.tsx
```

---

## 11. KEY INTEGRATION POINTS

### For Proximity Filtering:
1. **Registration**: Address geocoded and coordinates stored
2. **Company Listing**: Frontend calls GET /companies with proximity_filter=true
3. **Backend Filtering**: Uses user coordinates or ZIP approximation
4. **Caching**: Company data cached in React state after fetch

### For Authorization:
1. **Token Generated**: On login/register, JWT stored in localStorage
2. **Token Used**: All API requests include `Authorization: Bearer {token}` header
3. **Token Validated**: Every protected endpoint calls `Depends(get_current_user)`
4. **User Routing**: Frontend App.tsx routes based on user.user_type

### For Company Registration (Company Users):
1. **Companies.tsx**: Form to register new company
2. **POST /companies**: Backend stores company, geocodes address
3. **Ownership**: Company stored with created_by = current_user.id
4. **Visibility**: Company users only see their own companies

---

## Summary

The current user flow for browsing dumpster companies follows this pattern:

1. **Users register** with address/zipcode info → Address geocoded to coordinates
2. **Renters log in** → Routed to /groups page
3. **Renters create groups** → Multi-step form with Service Selection in Step 2
4. **Service Selection fetches** nearby companies based on:
   - Actual geographic distance (if coordinates available)
   - ZIP code approximation (fallback)
5. **Company listing filtered** to ~50 mile radius from user location
6. **Authorization enforced** at every API endpoint via JWT validation
7. **User types determine visibility:**
   - Renters: See all companies (proximity filtered)
   - Companies: See only their own companies
   - Admin: Full access to all data
