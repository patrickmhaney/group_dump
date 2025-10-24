# Early Service Selection Implementation Plan

## Overview

Transform the landing page to allow users to browse and select dumpster companies **before** login/registration, removing the barrier to viewing our core value proposition: price comparison across companies.

---

## Current vs. Proposed User Flow

### Current Flow
```
Landing Page → Login Required
    ↓
Login/Register (collect full info + zipcode)
    ↓
Groups Page → Create Group
    ↓
Step 2: Browse & Select Companies
    ↓
Steps 3-5: Complete group creation
```

### Proposed Flow
```
Landing Page with Zipcode Entry (PUBLIC)
    ↓
Browse Companies Immediately (PUBLIC)
    ↓
User clicks "Select [Company X]"
    ↓
Login/Register Prompt (zipcode pre-filled)
    ↓
Groups Page → Create Group
    ↓
Step 2: Company X Pre-selected & Highlighted (CAN CHANGE)
    ↓
Steps 3-5: Complete group creation
```

---

## Design Decision: Option 1 - Pre-selection with Flexibility

### User Experience Flow

1. **Landing Page Browsing (Unauthenticated)**
   - User enters zipcode (5-digit validation)
   - Sees filtered company list within 50-mile radius
   - Browses company details, pricing, ratings
   - Clicks **"Select [Company X - $299/week]"** button

2. **Data Persistence**
   - Store in localStorage:
     ```javascript
     {
       preselectedCompanyId: 123,
       preselectedServiceId: 456,  // specific dumpster size/price
       zipCode: "90210",
       timestamp: 1234567890
     }
     ```

3. **Login/Register Flow**
   - User prompted to login or register
   - Zipcode pre-filled in registration form
   - After successful auth, redirect to group creation

4. **Group Creation - Step 2 (Service Selection)**
   - **If preselection exists:**
     - Auto-scroll to preselected company
     - Highlight with visual badge: "✓ Previously Selected"
     - Pre-select specific dumpster size/service
     - Show clear messaging: "Continue with this option or compare others below"
     - Display prominent **"Continue with Company X"** button
     - Show **"Compare Others"** option to scroll to other companies

   - **If no preselection:**
     - Normal flow: show all companies without highlighting

5. **User Options**
   - **Option A:** Click "Continue" → keeps pre-selected company → proceeds to Step 3
   - **Option B:** Browse and change selection → select different company → proceeds to Step 3

### Visual Design - Step 2 Enhanced

```
┌─────────────────────────────────────────────────────────┐
│ ✓ Previously Selected                                   │
│                                                          │
│ [Company X Logo]                                         │
│ Company X - Serving Your Area                            │
│ ⭐⭐⭐⭐⭐ 4.8 (127 reviews)                              │
│                                                          │
│ Services Available:                                      │
│ ○ 10 yard dumpster - $199/week                          │
│ ● 20 yard dumpster - $299/week              [Selected]   │
│ ○ 30 yard dumpster - $399/week                          │
│                                                          │
│ [Continue with Company X]    [Compare Other Companies]  │
└─────────────────────────────────────────────────────────┘

────────── Other Available Companies ──────────

┌─────────────────────────────────────────────────────────┐
│ [Company Y Logo]                                         │
│ Company Y - Full Service Dumpsters                       │
│ ⭐⭐⭐⭐ 4.2 (89 reviews)                                │
│ ...                                                      │
└─────────────────────────────────────────────────────────┘

[Continue to Next Step]
```

---

## Technical Implementation Details

### Backend Changes

#### 1. New Public Endpoint
**Route:** `GET /companies/public`

**Parameters:**
- `zip_code` (required): 5-digit US zipcode
- Query params: `?zip_code=90210`

**Response:**
```json
{
  "companies": [
    {
      "id": 123,
      "name": "Company X",
      "service_areas": "Los Angeles County",
      "logo_url": "...",
      "rating": 4.8,
      "review_count": 127,
      "services": [
        {
          "id": 456,
          "dumpster_size": "20 yard",
          "price_per_week": 299,
          "description": "..."
        }
      ]
    }
  ],
  "search_location": {
    "zip_code": "90210",
    "city": "Beverly Hills",
    "state": "CA"
  }
}
```

**Implementation Notes:**
- No JWT authentication required
- Rate limiting: 100 requests per IP per hour (prevent scraping)
- Geocode zipcode using OpenStreetMap Nominatim API
- Use existing Haversine formula for 50-mile proximity filter (main.py:614-623)
- Cache geocoding results for common zipcodes (1 hour TTL)
- Return same data structure as authenticated `/companies` endpoint

**Code Location:** main.py (add after existing company routes)

**Security Considerations:**
- ✅ Expose: Company name, service areas, dumpster sizes/pricing, Google ratings, logo
- ⚠️ Consider hiding until login: Direct phone/email contact info
- Add rate limiting to prevent abuse/scraping
- Log requests for analytics

---

#### 2. Refactor Proximity Filtering
**Current:** Logic embedded in authenticated `/companies` route (main.py:614-623)

**Change:** Extract into reusable function
```python
def filter_companies_by_proximity(
    companies: List[Company],
    latitude: float,
    longitude: float,
    max_distance_miles: int = 50
) -> List[Company]:
    """
    Filter companies within max_distance_miles of given coordinates.
    Uses Haversine formula for accurate distance calculation.
    """
    # Existing logic from main.py:614-623
    pass
```

**Benefits:**
- DRY principle - used by both `/companies` and `/companies/public`
- Easier testing and maintenance
- Consistent behavior across authenticated and public endpoints

---

#### 3. Zipcode Geocoding with Caching
**Implementation:**
```python
from functools import lru_cache
import requests

@lru_cache(maxsize=1000)
def geocode_zipcode(zip_code: str) -> Dict[str, Any]:
    """
    Convert zipcode to coordinates using Nominatim API.
    Results cached for 1 hour to reduce API calls.
    """
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "postalcode": zip_code,
        "country": "US",
        "format": "json"
    }
    headers = {"User-Agent": "GroupDump/1.0"}

    response = requests.get(url, params=params, headers=headers)
    # Parse and return coordinates + location info
    pass
```

**Cache Strategy:**
- In-memory cache for most common zipcodes (top 1000)
- Consider Redis for production scalability
- Fallback to zipcode prefix approximation if geocoding fails (existing logic in main.py:423-448)

---

### Frontend Changes

#### 1. New Landing Page Component
**File:** `src/components/LandingPage.tsx` (new file)

**Features:**
- Hero section with value proposition
- Prominent zipcode input field (5-digit validation)
- "See Available Companies" CTA button
- Show spinner while geocoding/fetching companies
- Error handling for invalid zipcodes or no companies found

**Component Structure:**
```tsx
export default function LandingPage() {
  const [zipCode, setZipCode] = useState('');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    // Validate zipcode
    // Call /companies/public
    // Store zipCode in localStorage
    // Display results
  };

  return (
    <div>
      <Hero />
      <ZipCodeSearch onSearch={handleSearch} />
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {companies.length > 0 && (
        <PublicCompanyList
          companies={companies}
          onSelect={handleCompanySelect}
        />
      )}
    </div>
  );
}
```

---

#### 2. Reusable CompanyList Component
**Refactor:** Extract company display logic from `Groups.tsx` Step 2

**File:** `src/components/CompanyList.tsx` (new file)

**Props:**
```tsx
interface CompanyListProps {
  companies: Company[];
  selectedCompanyId?: number;
  selectedServiceId?: number;
  onSelect: (companyId: number, serviceId: number) => void;
  showPreselectionBadge?: boolean;
  preselectedCompanyId?: number;
  publicMode?: boolean; // Hide contact info in public mode
}
```

**Features:**
- Display company cards with logo, name, ratings
- Show available services (dumpster sizes/pricing)
- Highlight preselected company with badge
- Handle selection interaction (radio buttons or buttons)
- Responsive design (mobile-first)

**Usage:**
- Landing page: `publicMode={true}` (hide contact details, show "Select" buttons)
- Groups.tsx Step 2: `publicMode={false}` (show full details, handle preselection highlighting)

---

#### 3. LocalStorage Management
**File:** `src/utils/preselection.ts` (new file)

**Functions:**
```typescript
interface PreselectionData {
  preselectedCompanyId: number;
  preselectedServiceId: number;
  zipCode: string;
  timestamp: number;
}

export function savePreselection(data: PreselectionData): void {
  localStorage.setItem('groupdump_preselection', JSON.stringify(data));
}

export function getPreselection(): PreselectionData | null {
  const stored = localStorage.getItem('groupdump_preselection');
  if (!stored) return null;

  const data = JSON.parse(stored);

  // Expire after 48 hours
  const age = Date.now() - data.timestamp;
  const MAX_AGE = 48 * 60 * 60 * 1000; // 48 hours in ms

  if (age > MAX_AGE) {
    clearPreselection();
    return null;
  }

  return data;
}

export function clearPreselection(): void {
  localStorage.removeItem('groupdump_preselection');
}
```

**Usage:**
- Landing page: Call `savePreselection()` when user clicks "Select Company"
- Groups.tsx: Call `getPreselection()` on Step 2 mount to check for preselection
- Groups.tsx: Call `clearPreselection()` when user completes Step 2 (proceeds to Step 3)

---

#### 4. Update App.tsx Routing
**File:** `src/App.tsx`

**Current Logic:**
```tsx
<Route path="/" element={<Navigate to="/login" />} />
```

**New Logic:**
```tsx
<Route path="/" element={<LandingPage />} />
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
```

**Changes:**
- Landing page is now public (no redirect)
- Login/register remain as separate routes
- Groups remains protected (requires auth)

---

#### 5. Update Groups.tsx - Step 2
**File:** `src/components/Groups.tsx`

**Changes:**

1. **Check for preselection on mount:**
```tsx
useEffect(() => {
  const preselection = getPreselection();
  if (preselection && currentStep === 2) {
    setSelectedCompanyId(preselection.preselectedCompanyId);
    setSelectedServiceId(preselection.preselectedServiceId);

    // Auto-scroll to preselected company
    const companyElement = document.getElementById(
      `company-${preselection.preselectedCompanyId}`
    );
    if (companyElement) {
      companyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}, [currentStep]);
```

2. **Pass preselection data to CompanyList:**
```tsx
<CompanyList
  companies={companies}
  selectedCompanyId={selectedCompanyId}
  selectedServiceId={selectedServiceId}
  onSelect={handleSelectCompany}
  showPreselectionBadge={true}
  preselectedCompanyId={preselection?.preselectedCompanyId}
  publicMode={false}
/>
```

3. **Clear preselection when proceeding to Step 3:**
```tsx
const handleNextStep = () => {
  if (currentStep === 2) {
    clearPreselection(); // User has confirmed their selection
  }
  setCurrentStep(currentStep + 1);
};
```

---

#### 6. Update Register.tsx
**File:** `src/components/Register.tsx`

**Changes:**

1. **Pre-fill zipcode from preselection:**
```tsx
useEffect(() => {
  const preselection = getPreselection();
  if (preselection?.zipCode) {
    setZipCode(preselection.zipCode);
    // Optionally pre-fill city/state by geocoding
  }
}, []);
```

2. **Redirect to group creation after registration:**
```tsx
const handleRegister = async () => {
  // ... existing registration logic ...

  // After successful registration:
  const preselection = getPreselection();
  if (preselection) {
    navigate('/groups'); // Will show preselected company on Step 2
  } else {
    navigate('/groups'); // Normal flow
  }
};
```

---

### Edge Cases & Error Handling

#### 1. Preselected Company No Longer Available
**Scenario:** User selects Company X in "90210", then registers with address in "90211" which Company X doesn't serve.

**Handling:**
```tsx
// In Groups.tsx Step 2
useEffect(() => {
  const preselection = getPreselection();
  if (preselection) {
    const companyStillAvailable = companies.some(
      c => c.id === preselection.preselectedCompanyId
    );

    if (!companyStillAvailable) {
      // Show info message
      setInfoMessage(
        "Your selected company doesn't serve this exact address. " +
        "Here are nearby alternatives:"
      );
      clearPreselection(); // Don't try to highlight missing company
    }
  }
}, [companies]);
```

#### 2. User Clears Browser Data
**Scenario:** localStorage cleared between selection and registration

**Handling:**
- Graceful fallback: Groups.tsx Step 2 shows normal flow (no preselection)
- No error, just missing convenience feature
- User can still select company normally

#### 3. Stale Preselection Data
**Scenario:** User selects company, doesn't register for 3 days

**Handling:**
- `getPreselection()` returns `null` if timestamp > 48 hours old
- Automatically clears stale data
- User sees normal flow (no preselection)

#### 4. Multiple Group Creation
**Scenario:** User creates first group, then immediately creates another

**Handling:**
- `clearPreselection()` called when user proceeds from Step 2 to Step 3
- Second group creation shows normal flow (no preselection from first group)
- User can select same or different company

#### 5. No Companies Found for Zipcode
**Scenario:** User enters zipcode with no companies within 50 miles

**Handling:**
```tsx
// In LandingPage.tsx
if (response.companies.length === 0) {
  setError(
    "We don't have dumpster companies serving this area yet. " +
    "Please enter your email to be notified when service becomes available."
  );
  // Show email capture form for lead generation
}
```

#### 6. Invalid or Non-US Zipcode
**Scenario:** User enters "ABCDE" or Canadian postal code

**Handling:**
```tsx
// Client-side validation
const isValidZipCode = /^\d{5}$/.test(zipCode);
if (!isValidZipCode) {
  setError("Please enter a valid 5-digit US ZIP code");
  return;
}

// Server-side: Return 400 Bad Request
// Client: Display error message, keep user on landing page
```

---

## Implementation Roadmap

### Phase 1: Backend Foundation (1-2 days)

**Tasks:**
1. ✅ Create `/companies/public` endpoint (no auth required)
   - Route handler in main.py
   - Accept `zip_code` query parameter
   - Return company list with services

2. ✅ Implement rate limiting on public endpoint
   - Use slowapi or similar library
   - Limit: 100 requests per IP per hour
   - Return 429 Too Many Requests when exceeded

3. ✅ Extract proximity filtering into reusable function
   - `filter_companies_by_proximity()` in main.py or utils
   - Use in both `/companies` and `/companies/public`
   - Unit tests for distance calculations

4. ✅ Implement zipcode geocoding with caching
   - `geocode_zipcode()` function
   - Use Nominatim API with proper User-Agent header
   - In-memory LRU cache (1000 entries)
   - Fallback to zipcode prefix approximation

5. ✅ Testing
   - Test with various zipcodes (urban, rural, invalid)
   - Verify proximity filtering accuracy
   - Test rate limiting behavior
   - Load testing for cache performance

**Success Criteria:**
- `/companies/public?zip_code=90210` returns filtered company list
- Response time < 500ms for cached zipcodes
- Rate limiting prevents abuse
- No authentication required

---

### Phase 2: Frontend - Landing Page (2-3 days)

**Tasks:**
6. ✅ Create `LandingPage.tsx` component
   - Hero section with value proposition
   - Zipcode input with validation (5 digits)
   - "See Available Companies" CTA
   - Loading states (spinner during API call)
   - Error handling (invalid zipcode, no companies, network errors)

7. ✅ Extract reusable `CompanyList` component from Groups.tsx
   - Move company display logic to new component
   - Support both public and authenticated modes
   - Props for preselection highlighting
   - Responsive design (mobile-first)

8. ✅ Implement public company browsing view
   - Use `CompanyList` in public mode
   - Show company cards with pricing
   - Hide contact info (phone/email) until login
   - "Select Company" buttons

9. ✅ Create localStorage utility functions
   - `src/utils/preselection.ts`
   - `savePreselection()`, `getPreselection()`, `clearPreselection()`
   - 48-hour expiration logic

10. ✅ Connect landing page to API
    - Call `/companies/public` on zipcode submission
    - Handle loading/error states
    - Save zipcode to localStorage on successful search

**Success Criteria:**
- User can enter zipcode and see companies without login
- Company list displays pricing and ratings
- Selection stores data in localStorage
- Mobile responsive design
- Error messages are clear and actionable

---

### Phase 3: Integration & Conversion Flow (2-3 days)

**Tasks:**
11. ✅ Update App.tsx routing
    - Change `/` from redirect to `<LandingPage />`
    - Keep login/register as separate routes
    - Ensure protected routes still require auth

12. ✅ Add conversion trigger to landing page
    - "Select [Company X]" button on each company card
    - Saves preselection to localStorage
    - Redirects to `/register` or `/login`
    - Show clear messaging: "Sign up to continue with Company X"

13. ✅ Update Register.tsx to accept pre-filled zipcode
    - Check localStorage on mount
    - Pre-populate zipcode field
    - Optionally pre-fill city/state
    - Redirect to `/groups` after successful registration

14. ✅ Enhance Groups.tsx Step 2 with preselection handling
    - Check localStorage on mount
    - Auto-scroll to preselected company
    - Highlight with "✓ Previously Selected" badge
    - Pre-select specific service/dumpster size
    - Show "Continue" and "Compare Others" buttons
    - Clear localStorage when proceeding to Step 3

15. ✅ Implement smooth state handoff
    - Ensure preselection persists through login/registration
    - Handle missing/stale data gracefully
    - Clear preselection at appropriate times

**Success Criteria:**
- User can browse → select → register → see preselection seamlessly
- Preselected company is highlighted in Step 2
- User can still change selection if desired
- No data loss during authentication flow
- Stale preselections are cleaned up

---

### Phase 4: Polish & Optimization (1-2 days)

**Tasks:**
16. ✅ Add loading states throughout flow
    - Skeleton loaders for company cards
    - Spinner for zipcode geocoding
    - Progress indicators during navigation

17. ✅ Comprehensive error handling
    - Network errors (API down, timeout)
    - Invalid zipcode (client + server validation)
    - No companies found (show email capture form)
    - Geocoding failures (fallback to prefix method)
    - Rate limiting (friendly message, try again later)

18. ✅ Implement analytics tracking
    - Track zipcode searches (aggregate, not PII)
    - Track company selections (which companies most popular)
    - Track conversion rate (browse → register)
    - Track dropoff points in funnel
    - Use Google Analytics or similar

19. ✅ SEO optimization for landing page
    - Meta tags (title, description, og:image)
    - Semantic HTML (h1, h2, proper structure)
    - Schema.org markup for local businesses
    - Sitemap.xml including landing page
    - robots.txt (allow crawling)

20. ✅ Cross-browser/device testing
    - Chrome, Firefox, Safari, Edge
    - iOS Safari, Android Chrome
    - Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
    - Test localStorage persistence
    - Test zipcode input (various formats)
    - Test company selection flow end-to-end

**Success Criteria:**
- Smooth, polished user experience
- No console errors or warnings
- Analytics tracking all key events
- Good Lighthouse scores (>90 performance, accessibility, SEO)
- Works on all major browsers and devices

---

## Data Visibility & Privacy Considerations

### Public Endpoint Data Exposure

**Visible to Unauthenticated Users:**
- ✅ Company name
- ✅ Service areas (text description)
- ✅ Logo/branding
- ✅ Dumpster sizes and pricing
- ✅ Google ratings and review count
- ✅ General service descriptions

**Hidden Until Login:**
- ⚠️ Direct contact info (phone number, email)
- ⚠️ Detailed company address
- ⚠️ Real-time availability/booking calendar
- ⚠️ Company owner/admin info

**Rationale:**
- Pricing is the main value prop → must be public
- Contact info protected to prevent scraping
- Encourages registration to unlock communication
- Complies with company expectations (signed up to be listed, not scraped)

---

## Analytics & Success Metrics

### Key Metrics to Track

**Funnel Metrics:**
1. Landing page visits
2. Zipcode searches (% of visitors who search)
3. Company views (% who browse results)
4. Company selections (% who click "Select")
5. Registration starts (% who reach register page)
6. Registration completions (% who finish registration)
7. Group creations (% who complete Step 2 with preselection)

**Engagement Metrics:**
- Average companies viewed per session
- Time spent browsing companies
- Comparison rate (users who change preselection in Step 2)
- Repeat visitors (come back to search again)

**Business Metrics:**
- Conversion rate improvement (vs. old login-first flow)
- Lead quality (do pre-browsed users complete groups?)
- Geographic insights (which zipcodes most searched)
- Company popularity (which companies most selected)

**Implementation:**
```tsx
// Example: Track in LandingPage.tsx
const handleSearch = async (zipCode: string) => {
  analytics.track('zipcode_search', { zip_code: zipCode });
  // ... fetch companies ...
  analytics.track('search_results_shown', {
    zip_code: zipCode,
    company_count: companies.length
  });
};

const handleCompanySelect = (companyId: number, serviceId: number) => {
  analytics.track('company_selected', {
    company_id: companyId,
    service_id: serviceId,
    source: 'landing_page'
  });
  // ... save to localStorage ...
};
```

---

## Open Questions & Decisions Needed

### 1. Contact Information Visibility
**Question:** Should phone/email be visible before login, or only after?

**Options:**
- **Option A:** Hide all contact info until login (recommended)
  - Pro: Prevents scraping, encourages registration
  - Con: Less transparent, users can't call directly

- **Option B:** Show phone number, hide email
  - Pro: Allows immediate phone contact for urgent needs
  - Con: Partial scraping protection

- **Option C:** Show all contact info publicly
  - Pro: Maximum transparency
  - Con: No scraping protection, reduces registration incentive

**Recommendation:** Option A - full protection until login

---

### 2. Conversion Trigger Timing
**Question:** When exactly should we require login?

**Current Plan (Option 1):** Require login when user clicks "Select Company"

**Alternatives:**
- **Earlier:** Require login to see pricing
  - Pro: Protect pricing data
  - Con: Defeats purpose of early browsing

- **Later:** Require login only at group creation Step 3
  - Pro: Maximum browsing freedom
  - Con: Users might browse endlessly without converting

**Recommendation:** Stick with current plan (require at selection)

---

### 3. Branding & Messaging
**Question:** What should the landing page hero section say?

**Needs:**
- Clear value proposition (compare prices)
- Call-to-action (enter zipcode)
- Trust indicators (# of companies, ratings, etc.)

**Suggestions:**
- "Compare Dumpster Rental Prices in Your Area"
- "Find the Best Dumpster Rental Deal - Enter Your ZIP Code"
- "Save Money on Dumpster Rentals - Compare Local Companies"

**Recommendation:** User feedback needed

---

### 4. Filtering & Sorting
**Question:** Should public view have filters (price range, rating, size)?

**Options:**
- **Minimal:** Just show all companies, sorted by distance
  - Pro: Simple, fast to implement
  - Con: Users with many options may be overwhelmed

- **Basic:** Add sort options (price, rating, distance)
  - Pro: Easy to implement, improves UX
  - Con: Still limited flexibility

- **Advanced:** Add filters + sort (price range, min rating, sizes available)
  - Pro: Best UX, users find exact match
  - Con: More complex, could delay launch

**Recommendation:** Start with basic (Phase 1), add advanced in Phase 2

---

### 5. Mobile Experience Priorities
**Question:** Any specific mobile-first considerations?

**Key Areas:**
- Zipcode input (large, easy to tap)
- Company cards (readable without zooming)
- "Select" buttons (thumb-friendly size/position)
- Scroll performance (lazy load if many companies)

**Recommendation:** Review designs before implementation

---

### 6. No Service Area Coverage
**Question:** What to do when no companies serve a zipcode?

**Current Plan:** Show error + email capture form

**Additional Ideas:**
- "Notify me when service is available"
- "Suggest your area to companies" (lead gen for companies)
- "Find nearest service area" (suggest nearby zipcodes)
- Show national average pricing as reference

**Recommendation:** User preference needed

---

## Testing Strategy

### Unit Tests
- Proximity filtering function (Haversine calculations)
- Zipcode validation (client + server)
- Preselection localStorage utilities
- Geocoding cache behavior

### Integration Tests
- `/companies/public` endpoint (various zipcodes)
- Rate limiting enforcement
- Authentication flow with preselection
- Groups.tsx Step 2 with/without preselection

### E2E Tests (Playwright/Cypress)
1. **Happy Path:**
   - User lands on homepage
   - Enters zipcode "90210"
   - Sees company list
   - Clicks "Select Company X"
   - Registers (zipcode pre-filled)
   - Sees Company X highlighted in Step 2
   - Continues to Step 3

2. **Change Selection:**
   - Same as above, but user selects Company Y in Step 2
   - Verify Company Y is used in subsequent steps

3. **No Preselection:**
   - User registers without browsing
   - Sees normal Step 2 (no highlighting)
   - Selects company normally

4. **Stale Preselection:**
   - Mock localStorage with 49-hour-old timestamp
   - User starts group creation
   - Verify preselection is ignored

5. **Company Unavailable:**
   - User selects Company X in "90210"
   - Registers with address Company X doesn't serve
   - Sees info message in Step 2
   - Can select from available companies

### Manual Testing Checklist
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test on iPhone (Safari), Android (Chrome)
- [ ] Test with slow 3G network (loading states)
- [ ] Test with ad blockers (localStorage access)
- [ ] Test with various zipcodes (urban, rural, invalid)
- [ ] Test with private/incognito mode (localStorage)
- [ ] Test rate limiting (make 101 requests)
- [ ] Test zipcode with 0 companies (error handling)
- [ ] Test zipcode with 50+ companies (scrolling, performance)

---

## Rollout Strategy

### Phase 1: Internal Testing (Week 1)
- Deploy to staging environment
- Test with internal team (all roles)
- Gather feedback on UX/UI
- Fix critical bugs

### Phase 2: Beta Testing (Week 2)
- Deploy to production with feature flag
- Enable for 10% of traffic (A/B test)
- Monitor analytics (conversion rate vs. old flow)
- Gather user feedback (surveys, support tickets)

### Phase 3: Gradual Rollout (Week 3)
- If metrics positive, increase to 50% traffic
- Continue monitoring
- Address any issues

### Phase 4: Full Launch (Week 4)
- Enable for 100% of traffic
- Remove feature flag
- Update documentation
- Announce to users (email, blog post)

### Rollback Plan
- Keep old flow code intact
- Feature flag can instantly revert to old flow
- Database changes are non-breaking (additive only)
- Monitor error rates and conversion metrics

---

## Success Criteria

### Must Have (Launch Blockers)
- ✅ User can browse companies without login
- ✅ Preselection persists through registration
- ✅ Preselection highlights correct company in Step 2
- ✅ User can change selection after login
- ✅ No console errors or critical bugs
- ✅ Works on Chrome, Safari, Firefox (desktop + mobile)

### Should Have (Post-Launch OK)
- ✅ Rate limiting prevents abuse
- ✅ Analytics tracks full funnel
- ✅ SEO optimization complete
- ✅ Loading states throughout
- ✅ Graceful error handling for all edge cases

### Nice to Have (Future Iterations)
- Advanced filtering/sorting on landing page
- Company comparison tool (side-by-side)
- "Favorites" shortlist (Option 3 from earlier)
- Email capture for no-service areas
- A/B testing different CTAs

---

## Post-Launch Iterations

### Based on Analytics (Week 5+)
1. **If conversion rate improves:**
   - Invest in SEO (content, backlinks)
   - Run paid ads to landing page
   - Add more filtering options

2. **If users change selection often:**
   - Add "Compare" feature (select 2-3 companies)
   - Show side-by-side pricing table
   - Add "Why choose this company?" content

3. **If users drop off at registration:**
   - Simplify registration form
   - Add social login (Google, Facebook)
   - Defer some fields until after group creation

### Future Features
- Company reviews/ratings from GroupDump users (not just Google)
- "Popular in your area" badge for top companies
- Seasonal pricing alerts (rates change by season)
- Referral program (share your search results)
- Mobile app with location-based suggestions

---

## Risk Assessment & Mitigation

### Risk 1: Scraping & Data Abuse
**Impact:** Medium | **Likelihood:** Medium

**Mitigation:**
- Rate limiting on public endpoint (100/hour per IP)
- Monitor for unusual patterns (same IP, many zipcodes)
- Add CAPTCHA if abuse detected
- Consider hiding pricing until login (reduces value but protects data)

---

### Risk 2: Low Conversion Rate
**Impact:** High | **Likelihood:** Low

**Scenario:** Users browse but don't register

**Mitigation:**
- A/B test different CTAs ("Select Company" vs "Get Quote")
- Add urgency ("Limited availability this week")
- Show social proof ("127 groups created this month")
- Simplify registration (fewer fields)
- Feature flag allows instant rollback to old flow

---

### Risk 3: Performance Issues
**Impact:** Medium | **Likelihood:** Low

**Scenario:** Geocoding/proximity filtering is slow

**Mitigation:**
- Aggressive caching (zipcode → coordinates)
- Pre-compute company service areas (avoid real-time calculations)
- Add CDN for static company data
- Database indexing on company coordinates
- Monitor API response times (alert if >500ms)

---

### Risk 4: Companies Unhappy with Public Listing
**Impact:** Medium | **Likelihood:** Low

**Scenario:** Company owners don't want pricing public

**Mitigation:**
- Add company setting: "Show pricing before login" (default: true)
- Communicate change to all companies before launch
- Offer opt-out (hide from public search)
- Emphasize benefit (more qualified leads)

---

### Risk 5: Stale Preselection Confusion
**Impact:** Low | **Likelihood:** Medium

**Scenario:** User sees preselection from weeks-old search

**Mitigation:**
- 48-hour expiration (already planned)
- Clear messaging: "You were viewing this option [2 days ago]"
- Easy way to dismiss/clear preselection
- Analytics to track how often this happens

---

## Timeline Summary

**Total Estimated Time:** 6-8 days of development + 4 weeks rollout

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Backend | 1-2 days | Day 1 | Day 2 |
| Phase 2: Frontend Landing | 2-3 days | Day 3 | Day 5 |
| Phase 3: Integration | 2-3 days | Day 6 | Day 8 |
| Phase 4: Polish | 1-2 days | Day 9 | Day 10 |
| **Development Total** | **6-10 days** | | |
| Internal Testing | 1 week | Week 1 | Week 1 |
| Beta Testing (10%) | 1 week | Week 2 | Week 2 |
| Gradual Rollout (50%) | 1 week | Week 3 | Week 3 |
| Full Launch (100%) | 1 week | Week 4 | Week 4 |
| **Total Time to Full Launch** | **4-5 weeks** | | |

---

## Conclusion

This plan transforms the Group Dump landing page from a login wall into a powerful lead generation tool. By allowing users to browse and compare dumpster rental prices before registering, we:

1. **Reduce friction** - users see value immediately
2. **Increase conversion** - qualified leads who've already chosen a company
3. **Improve UX** - seamless flow from browsing → selection → registration
4. **Maintain flexibility** - users can still change their selection

The pre-selection with flexibility approach (Option 1) provides the best balance of guidance and user control, while the phased rollout ensures we can monitor metrics and iterate based on real data.

**Next Steps:**
1. Review and approve this plan
2. Answer open questions (branding, contact info visibility, etc.)
3. Begin Phase 1: Backend foundation
4. Schedule design reviews for landing page UI

---

**Document Version:** 1.0
**Last Updated:** 2025-10-23
**Status:** Awaiting approval
