# Group Dump User Flow Documentation Index

This directory contains comprehensive documentation of the Group Dump application's user flow, authentication, and company browsing features.

## Documentation Files

### 1. USER_FLOW_ANALYSIS.md (17 KB)
**Main comprehensive reference document**

Contains:
- Complete overview of the user flow
- Landing page implementation details
- Login flow with code examples
- Registration/Basic info page structure
- Service selection and company browsing mechanics
- Zipcode entry and proximity filtering algorithms
- Authentication and authorization checks
- User profile/zipcode update flow
- Complete data models
- Current flow sequence diagrams
- Component hierarchy
- Key integration points
- Summary of the entire system

**Best for:** Understanding the complete picture, deep dives into specific features

### 2. USER_FLOW_QUICK_REFERENCE.md (7.3 KB)
**Quick lookup and visual reference**

Contains:
- Key file locations table
- User journey map (ASCII diagram)
- API endpoints summary
- Authentication flow diagram
- Location-based filtering logic
- Authorization rules table
- Data flow for company filtering
- Key data fields for each concern
- Distance calculation methods
- Important constraints
- Testing checklist

**Best for:** Quick lookups, understanding relationships, debugging

### 3. CODE_LOCATIONS_AND_SNIPPETS.md (24 KB)
**Actual code with line numbers**

Contains:
- Complete file structure
- Landing page routing code
- Login flow implementation
- Registration form code
- Service selection/company browsing code
- Backend authentication functions
- Geocoding implementation
- Companies endpoint code
- Proximity filtering algorithms
- Admin checks
- User profile update code
- Database models
- Summary table of all key code locations

**Best for:** Finding specific code, making changes, integrating new features

---

## Quick Navigation Guide

### If you want to...

**Understand how users log in:**
- Start: USER_FLOW_ANALYSIS.md section 2
- Code: CODE_LOCATIONS_AND_SNIPPETS.md section 2

**Understand how users register and provide location info:**
- Start: USER_FLOW_ANALYSIS.md section 3
- Code: CODE_LOCATIONS_AND_SNIPPETS.md section 3

**Understand how companies are browsed and filtered:**
- Start: USER_FLOW_ANALYSIS.md section 4-5
- Quick ref: USER_FLOW_QUICK_REFERENCE.md (Location-Based Filtering)
- Code: CODE_LOCATIONS_AND_SNIPPETS.md section 4-5

**Understand proximity filtering algorithms:**
- Start: USER_FLOW_ANALYSIS.md section 5
- Quick ref: USER_FLOW_QUICK_REFERENCE.md (Distance Calculation Methods)
- Code: CODE_LOCATIONS_AND_SNIPPETS.md (Haversine & ZIP Approximation)

**Find a specific function or endpoint:**
- Use: CODE_LOCATIONS_AND_SNIPPETS.md (Summary table at end)

**Check authorization rules:**
- Quick ref: USER_FLOW_QUICK_REFERENCE.md (Authorization Rules table)
- Full details: USER_FLOW_ANALYSIS.md section 6

**Update a user's location/zipcode:**
- Start: USER_FLOW_ANALYSIS.md section 7
- Code: CODE_LOCATIONS_AND_SNIPPETS.md section 6

**Understand the database schema:**
- Start: USER_FLOW_ANALYSIS.md section 8
- Code: CODE_LOCATIONS_AND_SNIPPETS.md section 7

**Debug a user flow issue:**
- Use: USER_FLOW_QUICK_REFERENCE.md (Data Flow diagram, Testing checklist)
- Full trace: USER_FLOW_ANALYSIS.md (section 9 - Sequence diagram)

**Understand what each component does:**
- Use: USER_FLOW_ANALYSIS.md section 10 (Component Hierarchy)
- Also: CODE_LOCATIONS_AND_SNIPPETS.md (File Structure)

---

## Key Facts at a Glance

### Authentication
- **Method:** JWT (JSON Web Tokens)
- **Expiration:** 30 minutes
- **Storage:** localStorage (client-side)
- **Transmission:** Bearer token in Authorization header

### Authorization
- **Type:** Role-based (user_type field)
- **User Types:** "renter" or "company"
- **Admin:** Email-based (service.account.dc@groupdump.com)
- **Enforcement:** All protected endpoints use `Depends(get_current_user)`

### Location-Based Filtering
- **Primary Method:** Haversine formula (accurate geographic distance)
- **Fallback:** ZIP code prefix approximation
- **Range:** 50 miles (hard-coded)
- **Geocoding:** OpenStreetMap Nominatim API (free, no key required)

### Company Browsing
- **Location:** Step 2 of Group creation multi-step form (Groups.tsx)
- **Display:** Filtered list of companies based on user location
- **Authorization:** Renters see all (proximity filtered), Companies see only their own
- **Endpoint:** GET /companies with proximity_filter parameter

### Basic Info Collection
- **During:** User registration (Register.tsx)
- **Also:** User profile update (UserProfile.tsx)
- **Fields:** Address, City, State, ZIP Code
- **Processing:** Geocoded to coordinates for location-based filtering

---

## File Locations Summary

| Component | File Path | Lines |
|-----------|-----------|-------|
| Main Router | src/App.tsx | 70-89 |
| Login Form | src/components/Login.tsx | 15-42 |
| Registration Form | src/components/Register.tsx | 43-74 |
| Company Browsing | src/components/Groups.tsx | 460-474 |
| Company Management | src/components/Companies.tsx | - |
| User Profile | src/components/UserProfile.tsx | 43-64 |
| Backend API | main.py | 2793 lines total |
| Token Auth | main.py | 820-836 |
| Token Generation | main.py | 876-889 |
| Registration Endpoint | main.py | 847-874 |
| Companies Endpoint | main.py | 1695-1732 |
| Geocoding | main.py | 464-498 |
| Haversine | main.py | 614-623 |
| ZIP Approximation | main.py | 423-448 |

---

## Related Configuration

### Environment Variables (.env)
- DATABASE_URL - SQLite database path
- SECRET_KEY - JWT signing key
- SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD - Email config
- FROM_EMAIL - Email sender address
- STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY - Stripe integration
- BASE_URL - Application base URL
- GOOGLE_PLACES_API_KEY - Google Maps API (optional, for Google ratings)

### Dependencies
**Frontend:**
- React Router (routing)
- Axios (HTTP client)
- TypeScript (type safety)

**Backend:**
- FastAPI (web framework)
- SQLAlchemy (ORM)
- Pydantic (validation)
- Python-jose (JWT)
- Passlib (password hashing)
- Aiohttp (async HTTP)
- Requests (HTTP library)

---

## Document Version Info

- **Created:** October 23, 2025
- **Based on Branch:** PMH-vendor-listing-subscription
- **Last Commit Analyzed:** 63e841b (google ratings)

---

## How to Use These Documents

1. **Start with USER_FLOW_QUICK_REFERENCE.md** for a visual overview
2. **Read USER_FLOW_ANALYSIS.md** for comprehensive understanding
3. **Use CODE_LOCATIONS_AND_SNIPPETS.md** when you need to write or modify code
4. **Cross-reference** between documents as needed

These documents describe the current architecture and flow. They're useful for:
- Onboarding new developers
- Planning feature changes
- Debugging user flows
- Understanding authorization model
- Implementing new features
