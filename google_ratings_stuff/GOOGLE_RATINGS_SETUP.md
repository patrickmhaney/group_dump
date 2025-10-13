# Google Star Ratings Setup Guide

Complete guide to setting up and using Google star ratings for your companies.

## Prerequisites

1. **Google Places API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a project (or select existing)
   - Enable "Places API (New)"
   - Create an API key
   - Add the key to your `.env` file:
     ```
     GOOGLE_PLACES_API_KEY=your_api_key_here
     ```

2. **Install Dependencies**
   ```bash
   pip install googlemaps
   ```

## Setup Steps

### Step 1: Run Database Migration
```bash
python3 migrate_google_ratings.py
```
This adds the Google rating fields to your companies table.

### Step 2: Populate Google Place IDs

You have two options:

#### Option A: Interactive Mode (Recommended for first time)
```bash
python3 populate_google_place_ids.py
```
- Shows you search results for each company
- Lets you manually select the correct match
- Allows custom searches if no good matches
- Best for ensuring accuracy

**Features:**
- Shows top 5 matches with ratings and reviews
- Option to skip companies
- Custom search functionality
- Confirms before saving

#### Option B: Automatic Mode (Faster)
```bash
python3 auto_populate_place_ids.py
```
- Automatically assigns the best match (first result)
- Much faster for bulk operations
- Shows summary of successes/failures
- Best when you trust the search accuracy

### Step 3: Fetch Ratings from Google

Once Place IDs are populated, fetch the actual ratings:

1. **Generate an admin token:**
   ```bash
   python3 get_admin_token.py
   ```

2. **Call the refresh endpoint** (copy the curl command from the output):
   ```bash
   curl -X POST http://localhost:8000/companies/refresh-all-google-ratings \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

   **Expected Response:**
   ```json
   {
     "total": 10,
     "updated": 9,
     "failed": 1,
     "errors": ["Company 5 (ABC): Failed to fetch rating"]
   }
   ```

### Step 4: View Ratings

Open your frontend and view companies - Google star ratings will now display automatically!

## Maintenance

### Refresh Ratings Periodically

To update ratings with fresh data from Google:

```bash
# Get a new token
python3 get_admin_token.py

# Run the refresh
curl -X POST http://localhost:8000/companies/refresh-all-google-ratings \
  -H "Authorization: Bearer YOUR_NEW_TOKEN"
```

### Add New Companies

When adding new companies:

1. **With Place ID:** Add the `google_place_id` when creating the company - the rating will be fetched automatically

2. **Without Place ID:** Run the populate script again:
   ```bash
   python3 populate_google_place_ids.py
   ```

## API Endpoints

### Refresh All Companies (Admin Only)
```
POST /companies/refresh-all-google-ratings
```
Fetches ratings for ALL companies with Place IDs.

### Refresh Single Company
```
POST /companies/{company_id}/refresh-google-rating
```
Refreshes rating for one specific company.

## Troubleshooting

### "No module named 'googlemaps'"
```bash
pip install googlemaps
```

### "GOOGLE_PLACES_API_KEY not found"
Make sure you've added the key to your `.env` file:
```
GOOGLE_PLACES_API_KEY=AIzaSy...your_key_here
```

### "Failed to fetch rating"
- Check that the Place ID is valid
- Verify your API key has Places API enabled
- Check API quota/billing in Google Cloud Console

### Wrong business matched
Use the interactive mode (`populate_google_place_ids.py`) to manually select the correct match.

## Database Schema

New fields added to `companies` table:

| Field | Type | Description |
|-------|------|-------------|
| `google_place_id` | TEXT | Google's unique identifier for the business |
| `google_rating` | REAL | Star rating (0.0 - 5.0) |
| `google_user_ratings_total` | INTEGER | Total number of reviews |
| `google_rating_updated_at` | TIMESTAMP | When rating was last fetched |

## Cost Considerations

Google Places API pricing (as of 2025):
- Place Search: $0.032 per request
- Place Details: $0.017 per request

For 100 companies:
- Initial population: ~$3.20 (100 searches)
- Refresh ratings: ~$1.70 (100 detail requests)

Set up billing alerts in Google Cloud Console!

## Support

If you encounter issues:
1. Check the error messages carefully
2. Verify API key has correct permissions
3. Check billing is enabled in Google Cloud
4. Review the company data for completeness (name, address, etc.)
