# Code Locations and Key Snippets

## File Structure

```
/home/patrickmhaney/group_dump/
├── src/
│   ├── App.tsx                          (Main routing)
│   ├── index.tsx                        (React entry point)
│   └── components/
│       ├── Login.tsx                    (Login page)
│       ├── Register.tsx                 (Registration form)
│       ├── Groups.tsx                   (Renter dashboard + group creation)
│       ├── Companies.tsx                (Company dashboard)
│       ├── UserProfile.tsx              (Profile editing)
│       ├── Join.tsx                     (Invitee join flow)
│       ├── Admin.tsx                    (Admin dashboard)
│       ├── ServiceConfirmation.tsx      (Order confirmation)
│       ├── ServiceOrderSummary.tsx      (Order summary)
│       ├── PaymentRequestDashboard.tsx  (Payment tracking)
│       ├── PaymentSetup.tsx             (Payment method)
│       ├── InviteePaymentSetup.tsx      (Invitee payment)
│       └── StripeProvider.tsx           (Stripe integration)
│       
└── main.py                              (Backend API - 2793 lines)
```

---

## 1. Landing Page / Routing (src/App.tsx)

**File Location:** `/home/patrickmhaney/group_dump/src/App.tsx`

### Main Router Configuration (lines 70-89)

```typescript
<Router>
  <div className="App">
    <div className="container">
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to={...} />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to={...} />} />
        
        {/* Groups for renters */}
        <Route path="/groups" element={
          user ? (user.user_type === 'renter' ? <Groups /> : <Navigate to="/companies" />) 
          : <Navigate to="/login" />
        } />
        
        {/* Companies for company users */}
        <Route path="/companies" element={
          user ? (user.email === 'service.account.dc@groupdump.com' || user.user_type === 'company' 
            ? <Companies /> 
            : <Navigate to="/groups" />) 
          : <Navigate to="/login" />
        } />
        
        {/* User profile */}
        <Route path="/profile" element={user ? <UserProfile /> : <Navigate to="/login" />} />
        
        {/* Admin dashboard */}
        <Route path="/admin" element={
          user && user.email === 'service.account.dc@groupdump.com' ? <Admin /> : <Navigate to="/" />
        } />
        
        {/* Public invitee join link */}
        <Route path="/join/:token" element={<Join />} />
        
        {/* Root redirect */}
        <Route path="/" element={<Navigate to={...} />} />
      </Routes>
    </div>
  </div>
</Router>
```

### AuthContext Setup (lines 24-34)

```typescript
export const AuthContext = React.createContext<{
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});
```

---

## 2. Login Flow (src/components/Login.tsx)

**File Location:** `/home/patrickmhaney/group_dump/src/components/Login.tsx`

### Login Form Submission (lines 15-42)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    const formData = new FormData();
    formData.append('username', email);      // Note: uses 'username' field
    formData.append('password', password);

    // Get token
    const tokenResponse = await axios.post('/token', formData);
    
    // Get user data
    const userResponse = await axios.get('/users/me', {
      headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
    });

    // Store in context and localStorage
    login(tokenResponse.data.access_token, userResponse.data);
    
    // Support redirect parameter
    const redirectPath = searchParams.get('redirect');
    if (redirectPath) {
      navigate(redirectPath);
    }
  } catch (err: any) {
    setError(err.response?.data?.detail || 'Login failed');
  } finally {
    setLoading(false);
  }
};
```

---

## 3. Registration / Basic Info (src/components/Register.tsx)

**File Location:** `/home/patrickmhaney/group_dump/src/components/Register.tsx`

### Registration Form Data (lines 7-18)

```typescript
const [formData, setFormData] = useState({
  email: '',
  name: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  password: '',
  confirmPassword: '',
  user_type: 'renter'  // Default to renter
});
```

### User Type Selection (lines 164-180)

```typescript
<select
  name="user_type"
  value={formData.user_type}
  onChange={handleChange}
  required
>
  <option value="renter">Dumpster Renter</option>
  <option value="company">Dumpster Company</option>
</select>
```

### ZIP Code Validation (lines 150-159)

```typescript
<input
  type="text"
  name="zip_code"
  placeholder="Zip Code"
  value={formData.zip_code}
  onChange={handleChange}
  pattern="[0-9]{5}"
  title="Please enter a 5-digit zip code"
  required
/>
```

### Registration Submission (lines 43-74)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  if (formData.password !== formData.confirmPassword) {
    setError('Passwords do not match');
    setLoading(false);
    return;
  }

  try {
    // Register user
    const registerData = {
      email: formData.email,
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zip_code: formData.zip_code,
      password: formData.password,
      user_type: formData.user_type
    };

    await axios.post('/register', registerData);

    // Auto-login after registration
    const loginFormData = new FormData();
    loginFormData.append('username', formData.email);
    loginFormData.append('password', formData.password);

    const tokenResponse = await axios.post('/token', loginFormData);
    const userResponse = await axios.get('/users/me', {
      headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
    });

    login(tokenResponse.data.access_token, userResponse.data);
    
    // Handle redirect
    const redirectPath = searchParams.get('redirect');
    if (redirectPath) {
      navigate(redirectPath);
    }
  } catch (err: any) {
    // Error handling...
  }
};
```

---

## 4. Service Selection / Company Browsing (src/components/Groups.tsx)

**File Location:** `/home/patrickmhaney/group_dump/src/components/Groups.tsx`

### Fetch Companies on Mount (lines 316-342)

```typescript
useEffect(() => {
  fetchGroups();
  fetchCompanies();      // ← Fetches companies on component mount
  fetchRentals();
  
  // Load payment requests sent state from localStorage
  const savedPaymentRequestsSent = localStorage.getItem('paymentRequestsSent');
  if (savedPaymentRequestsSent) {
    try {
      const parsed = JSON.parse(savedPaymentRequestsSent);
      setPaymentRequestsSent(new Set(parsed));
    } catch (e) {
      console.error('Error loading payment requests state:', e);
    }
  }

  // Load per-member amounts from localStorage
  const savedPerMemberAmounts = localStorage.getItem('perMemberAmounts');
  if (savedPerMemberAmounts) {
    try {
      const parsed = JSON.parse(savedPerMemberAmounts);
      setPerMemberAmounts(parsed);
    } catch (e) {
      console.error('Error loading per-member amounts:', e);
    }
  }
}, []);
```

### fetchCompanies Function (lines 460-474)

```typescript
const fetchCompanies = async () => {
  try {
    const response = await axios.get('/companies', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      params: {
        proximity_filter: true  // ← Always enabled in Groups
      }
    });
    setCompanies(response.data);
  } catch (error) {
    console.error('Error fetching companies:', error);
  }
};
```

### Multi-Step Form Structure (lines 1087-1148)

```typescript
<div style={{ marginBottom: '30px', padding: '20px 0' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
    {/* Progress Line */}
    <div style={{...}}>
      <div style={{...}} /> {/* Progress bar fill */}
    </div>

    {/* Step Circles */}
    {[
      { num: 1, label: 'Basic Info' },
      { num: 2, label: 'Service' },          {/* ← Company browsing step */}
      { num: 3, label: 'Invites' },
      { num: 4, label: 'Dates' },
      { num: 5, label: 'Payment' }
    ].map(step => (
      <div key={step.num} style={{...}}>
        <div
          onClick={() => handleStepClick(step.num)}
          style={{...}}
        >
          {step.num < currentStep ? '✓' : step.num}
        </div>
        <div style={{...}}>
          {step.label}
        </div>
      </div>
    ))}
  </div>
</div>
```

### Step 1: Basic Info Form (lines 1154-1278)

```typescript
{currentStep === 1 && (
  <div>
    <div style={{ marginBottom: '15px' }}>
      <label style={{...}}>Group Name</label>
      <input
        type="text"
        name="name"
        placeholder="Group Name"
        value={formData.name}
        onChange={handleChange}
        required
      />
    </div>

    <div style={{ marginBottom: '15px' }}>
      <label style={{...}}>Drop-off Address</label>
      <input type="text" name="street_address" placeholder="Street Address" {...} />
      <input type="text" name="city" placeholder="City" {...} />
      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '12px' }}>
        <input type="text" name="state" placeholder="State" {...} />
        <input type="text" name="zip_code" placeholder="ZIP Code" pattern="[0-9]{5}(-[0-9]{4})?" {...} />
      </div>
    </div>

    <div style={{ marginBottom: '15px' }}>
      <label style={{...}}>Group Members</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))' }}>
        {[1, 2, 3, 4].map(num => (
          <label key={num} style={{...}}>
            <input
              type="radio"
              name="max_participants"
              value={num}
              checked={formData.max_participants === num}
              onChange={handleChange}
              style={{ display: 'none' }}
            />
            <span style={{...}}>
              {num === 1 ? '1 Member' : `${num} Members`}
            </span>
          </label>
        ))}
      </div>
    </div>
  </div>
)}
```

### Step 2: Service Selection (lines 1280+)

```typescript
{currentStep === 2 && companies.length > 0 && (
  <div style={{ marginBottom: '20px' }}>
    {/* Service selection UI rendered here */}
    {/* Companies are displayed with options to select */}
  </div>
)}
```

---

## 5. Backend Authentication (main.py)

**File Location:** `/home/patrickmhaney/group_dump/main.py`

### get_current_user Function (lines 820-836)

```python
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(func.lower(User.email) == func.lower(email)).first()
    if user is None:
        raise credentials_exception
    return user
```

### Token Generation (lines 876-889)

```python
@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == func.lower(form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
```

### Registration Endpoint (lines 847-874)

```python
@app.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(func.lower(User.email) == func.lower(user.email)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Geocode the user's address
    coordinates = await geocode_address(user.address, user.city, user.state, user.zip_code)
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        name=user.name,
        phone=user.phone,
        address=user.address,
        city=user.city,
        state=user.state,
        zip_code=user.zip_code,
        latitude=coordinates[0] if coordinates else None,
        longitude=coordinates[1] if coordinates else None,
        geocoded_at=datetime.utcnow() if coordinates else None,
        hashed_password=hashed_password,
        user_type=user.user_type
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
```

### Geocoding Function (lines 464-498)

```python
async def geocode_address(address: str, city: str, state: str, zip_code: str) -> Optional[Tuple[float, float]]:
    """
    Geocode an address using OpenStreetMap Nominatim API
    Returns (latitude, longitude) tuple or None if geocoding fails
    """
    try:
        # Format address for geocoding
        full_address = f"{address}, {city}, {state} {zip_code}, USA" if address else f"{city}, {state} {zip_code}, USA"
        
        # OpenStreetMap Nominatim API (free, no API key required)
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': full_address,
            'format': 'json',
            'limit': 1,
            'countrycodes': 'us'
        }
        headers = {
            'User-Agent': 'DumpsterSharingApp/1.0'  # Required by Nominatim
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    if data:
                        lat = float(data[0]['lat'])
                        lon = float(data[0]['lon'])
                        return (lat, lon)
        
        return None
        
    except Exception as e:
        print(f"Geocoding error for '{full_address}': {str(e)}")
        return None
```

### Companies Endpoint (lines 1695-1732)

```python
@app.get("/companies", response_model=list[CompanyResponse])
async def get_companies(
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
    proximity_filter: bool = True,
    db: Session = Depends(get_db)
):
    if current_user.user_type == "company":
        # Company users can only see their own companies
        companies = db.query(Company).filter(Company.created_by == current_user.id).offset(skip).limit(limit).all()
    else:
        # Rental users can see all companies to select services
        companies = db.query(Company).offset(skip).limit(limit).all()
        
        # Filter by proximity for rental users using geographic distance if coordinates available
        if proximity_filter:
            if current_user.latitude and current_user.longitude:
                # Use accurate geographic distance with zip code fallback
                companies = await filter_companies_by_actual_distance(
                    companies,
                    current_user.latitude,
                    current_user.longitude,
                    user_zip=current_user.zip_code
                )
            elif current_user.zip_code:
                # Fallback to zip code approximation
                companies = filter_companies_by_proximity(companies, current_user.zip_code)
    
    result = []
    for company in companies:
        company_data = {
            "id": company.id,
            "name": company.name,
            "email": company.email,
            "phone": company.phone,
            "address": company.address,
            "city": company.city,
            "state": company.state,
            "zip_code": company.zip_code,
            "website": company.website,
            "service_areas": company.service_areas,
            "dumpster_sizes": [DumpsterSize(**size) for size in json.loads(company.dumpster_sizes)] if company.dumpster_sizes else [],
            "rating": company.rating,
            "google_place_id": company.google_place_id,
            "google_rating": company.google_rating,
            "google_user_ratings_total": company.google_user_ratings_total
        }
        result.append(CompanyResponse(**company_data))
    return result
```

### Proximity Filtering - Haversine (lines 614-623)

```python
def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great circle distance between two points on earth (specified in decimal degrees)"""
    from math import radians, cos, sin, asin, sqrt
    # Convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 3959  # Radius of Earth in miles
    return c * r
```

### Proximity Filtering - ZIP Approximation (lines 423-448)

```python
def calculate_zip_distance_approximation(zip1: str, zip2: str) -> float:
    """
    Approximate distance between two US zip codes using first 3 digits.
    This is a simplified calculation for proximity filtering.
    Returns distance in miles (approximate).
    """
    if not zip1 or not zip2 or len(zip1) < 5 or len(zip2) < 5:
        return float('inf')
    
    # Simple approximation based on zip code prefixes
    prefix1 = int(zip1[:3])
    prefix2 = int(zip2[:3])
    
    # Rough approximation: each zip prefix difference = ~50 miles
    prefix_diff = abs(prefix1 - prefix2)
    
    if prefix_diff == 0:
        return 0  # Same area
    elif prefix_diff <= 1:
        return 25  # Adjacent areas
    elif prefix_diff <= 3:
        return prefix_diff * 30  # Nearby areas
    else:
        return prefix_diff * 50  # Farther areas
```

### Admin-Only Check (lines 838-845)

```python
async def get_admin_user(current_user: User = Depends(get_current_user)):
    """Verify user is the admin account"""
    if current_user.email.lower() != "service.account.dc@groupdump.com".lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )
    return current_user
```

---

## 6. User Profile Update (src/components/UserProfile.tsx)

**File Location:** `/home/patrickmhaney/group_dump/src/components/UserProfile.tsx`

### Profile Update Submission (lines 43-64)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setSuccess('');

  try {
    const response = await axios.put('/users/me', formData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Update the user context with new data
    login(response.data, token);    // Note: login() updates user context
    setSuccess('Profile updated successfully!');
  } catch (err: any) {
    setError(err.response?.data?.detail || 'Failed to update profile');
  } finally {
    setLoading(false);
  }
};
```

### Backend Profile Update (main.py:895-914)

```python
@app.put("/users/me", response_model=UserResponse)
async def update_user(
    user_update: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Geocode the user's address if location data changed
    coordinates = await geocode_address(
        user_update.address,
        user_update.city,
        user_update.state,
        user_update.zip_code
    )

    # Update user fields
    current_user.name = user_update.name
    current_user.phone = user_update.phone
    current_user.address = user_update.address
    current_user.city = user_update.city
    current_user.state = user_update.state
    current_user.zip_code = user_update.zip_code
    current_user.latitude = coordinates[0] if coordinates else None
    current_user.longitude = coordinates[1] if coordinates else None
    current_user.geocoded_at = datetime.utcnow() if coordinates else None

    db.commit()
    db.refresh(current_user)

    return current_user
```

---

## 7. Database Models (main.py)

### User Model (lines 133-151)

```python
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    phone = Column(String)
    address = Column(String)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String)
    latitude = Column(Float, nullable=True)           # Geocoded
    longitude = Column(Float, nullable=True)          # Geocoded
    geocoded_at = Column(DateTime, nullable=True)
    hashed_password = Column(String)
    user_type = Column(String, default="renter")  # "renter" or "company"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    groups = relationship("GroupMember", back_populates="user")
```

### Company Model (lines 185-212)

```python
class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String, nullable=False)  # Required for filtering
    latitude = Column(Float, nullable=True)           # Geocoded
    longitude = Column(Float, nullable=True)          # Geocoded
    geocoded_at = Column(DateTime, nullable=True)
    website = Column(String, nullable=False)
    service_areas = Column(Text, nullable=True)
    dumpster_sizes = Column(Text)  # JSON string
    commission_rate = Column(Float, default=0.08)
    rating = Column(Float, default=0.0)
    google_place_id = Column(String, nullable=True)
    google_rating = Column(Float, nullable=True)
    google_user_ratings_total = Column(Integer, nullable=True)
    google_rating_updated_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))  # Owner
    created_at = Column(DateTime, default=datetime.utcnow)
    
    rentals = relationship("Rental", back_populates="company")
    creator = relationship("User", foreign_keys=[created_by])
```

---

## Summary of Key Code Locations

| Feature | Frontend | Backend |
|---------|----------|---------|
| **Landing Page** | `src/App.tsx:70-89` | `main.py:2790` (root endpoint) |
| **Login** | `src/components/Login.tsx:15-42` | `main.py:876-889` |
| **Registration** | `src/components/Register.tsx:43-74` | `main.py:847-874` |
| **Company Browsing** | `src/components/Groups.tsx:460-474` | `main.py:1695-1732` |
| **Proximity Filtering** | `src/components/Groups.tsx:467` | `main.py:1704-1711` |
| **Haversine Formula** | N/A | `main.py:614-623` |
| **ZIP Approximation** | N/A | `main.py:423-448` |
| **Geocoding** | N/A | `main.py:464-498` |
| **Authentication** | `src/App.tsx:36-68` | `main.py:820-836` |
| **Authorization (GET /companies)** | N/A | `main.py:1697-1711` |
| **Profile Update** | `src/components/UserProfile.tsx:43-64` | `main.py:895-914` |

