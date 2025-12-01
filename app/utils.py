"""Utility functions for email, geocoding, and other helper tasks"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import secrets
import math
import aiohttp
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.config import (
    SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD,
    FROM_EMAIL, BASE_URL, GOOGLE_PLACES_API_KEY, gmaps_client
)
from app.models import Group, User, Invitee


async def send_email(to_email: str, subject: str, body: str):
    """Send email using SMTP"""
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print(f"Email configuration not set. Would send to {to_email}: {subject}")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        text = msg.as_string()
        server.sendmail(FROM_EMAIL, to_email, text)
        server.quit()

        print(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        print(f"Error sending email to {to_email}: {str(e)}")
        return False


def generate_join_token():
    """Generate a secure random token for joining groups"""
    return secrets.token_urlsafe(32)


async def send_invitations(group: Group, creator: User, db: Session):
    """Send invitation emails to all invitees of a group"""
    invitees = db.query(Invitee).filter(Invitee.group_id == group.id).all()

    for invitee in invitees:
        if not invitee.invitation_sent:
            subject = f"You're invited to join '{group.name}' dumpster sharing group!"

            # Use the configured BASE_URL
            join_url = f"{BASE_URL}/join/{invitee.join_token}"

            # Create email body with group details and join link
            register_url = f"{BASE_URL}/register?email={invitee.email}"
            body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #2c3e50;">🗑️ You're invited to join a dumpster sharing group!</h2>

                        <p>Hi {invitee.name},</p>

                        <p>{creator.name} has invited you to join their dumpster sharing group. This is a great way to <strong>split costs</strong> and coordinate with neighbors for home projects, cleanouts, or renovations.</p>

                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #495057;">What is Group Dump?</h3>
                            <p style="margin-bottom: 0;">Instead of renting a whole dumpster yourself, you can split the cost with neighbors who also need to dispose of materials. Everyone saves money and coordinates pickup schedules together!</p>
                        </div>

                        <h3 style="color: #28a745;">Group Details:</h3>
                        <ul style="background-color: #f8f9fa; padding: 15px; border-radius: 6px;">
                            <li><strong>Drop-off Location:</strong> {group.address}</li>
                            <li><strong>Target Group Size:</strong> {group.max_participants}</li>
                            <li><strong>Organized by:</strong> {creator.name} ({creator.email})</li>
                        </ul>

                        <div style="background-color: #d1ecf1; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p style="margin: 0;"><strong>💡</strong> Click the link below to see the details and decide if you're interested. You can join in just a few clicks.</p>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{join_url}" style="background-color: #28a745; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; border-radius: 6px; font-weight: bold;">
                                View Invitation & Join Group
                            </a>
                        </div>

                        <div style="font-size: 14px; color: #6c757d; border-top: 1px solid #dee2e6; padding-top: 15px; margin-top: 30px;">
                            <p><strong>Want to create an account first?</strong> <a href="{register_url}" style="color: #007bff;">Sign up here</a> (completely optional)</p>
                            <p><strong>Or copy and paste this link:</strong><br>
                            <a href="{join_url}" style="color: #007bff;">{join_url}</a></p>
                            <p>Questions? Contact {creator.name} at {creator.email}</p>
                        </div>
                    </div>
                </body>
            </html>
            """

            # Send the email
            success = await send_email(invitee.email, subject, body)

            if success:
                invitee.invitation_sent = True
                db.add(invitee)

    db.commit()


async def send_invitations_to_specific_invitees(group: Group, creator: User, invitees: list, db: Session):
    """Send invitation emails to specific invitees"""
    for invitee in invitees:
        subject = f"You're invited to join '{group.name}' dumpster sharing group!"

        # Use the configured BASE_URL
        join_url = f"{BASE_URL}/join/{invitee.join_token}"

        # Create email body with group details and join link
        body = f"""
        <html>
            <body>
                <h2>You've been invited to join a dumpster sharing group!</h2>

                <p>Hi {invitee.name},</p>

                <p>{creator.name} has invited you to join the dumpster sharing group "<strong>{group.name}</strong>".</p>

                <h3>Group Details:</h3>
                <ul>
                    <li><strong>Drop-off Location:</strong> {group.address}</li>
                    <li><strong>Target Group Size:</strong> {group.max_participants}</li>
                    <li><strong>Created by:</strong> {creator.name} ({creator.email})</li>
                </ul>

                <p>Join this group to share dumpster rental costs and coordinate pickup schedules with your neighbors!</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{join_url}" style="background-color: #4CAF50; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 4px;">
                        Join Group Now
                    </a>
                </div>

                <p><strong>Or copy and paste this link:</strong><br>
                <a href="{join_url}">{join_url}</a></p>

                <p>If you have any questions, feel free to contact {creator.name} at {creator.email}.</p>

                <p>Best regards,<br>The Dumpster Sharing Team</p>
            </body>
        </html>
        """

        # Send the email
        success = await send_email(invitee.email, subject, body)

        if success:
            invitee.invitation_sent = True
            db.add(invitee)

    db.commit()


def calculate_zip_distance_approximation(zip1: str, zip2: str) -> float:
    """
    Approximate distance between two US zip codes using first 3 digits.
    This is a simplified calculation for proximity filtering.
    Returns distance in miles (approximate).
    """
    if not zip1 or not zip2 or len(zip1) < 5 or len(zip2) < 5:
        return float('inf')

    # Simple approximation based on zip code prefixes
    # This is not accurate but provides reasonable proximity filtering
    prefix1 = int(zip1[:3])
    prefix2 = int(zip2[:3])

    # Rough approximation: each zip prefix difference = ~50 miles
    # This is very approximate but works for basic proximity filtering
    prefix_diff = abs(prefix1 - prefix2)

    if prefix_diff == 0:
        return 0  # Same area
    elif prefix_diff <= 1:
        return 25  # Adjacent areas
    elif prefix_diff <= 3:
        return prefix_diff * 30  # Nearby areas
    else:
        return prefix_diff * 50  # Farther areas


def filter_companies_by_proximity(companies: list, user_zip: str, max_distance: int = 50) -> list:
    """Filter companies within max_distance miles of user zip code"""
    if not user_zip:
        return companies

    nearby_companies = []
    for company in companies:
        if hasattr(company, 'zip_code') and company.zip_code:
            distance = calculate_zip_distance_approximation(user_zip, company.zip_code)
            if distance <= max_distance:
                nearby_companies.append(company)

    return nearby_companies


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


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth
    using the Haversine formula. Returns distance in miles.
    """
    # Convert latitude and longitude from degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))

    # Radius of Earth in miles
    r = 3959

    return c * r


async def filter_companies_by_actual_distance(companies: list, user_lat: float, user_lon: float, max_distance: float = 50.0, user_zip: str = None) -> list:
    """Filter companies within max_distance miles of user coordinates using actual geographic distance"""
    if not user_lat or not user_lon:
        return companies

    nearby_companies = []
    for company in companies:
        added = False
        if hasattr(company, 'latitude') and hasattr(company, 'longitude') and company.latitude and company.longitude:
            distance = calculate_haversine_distance(user_lat, user_lon, company.latitude, company.longitude)
            if distance <= max_distance:
                nearby_companies.append(company)
                added = True

        # Also try zip code fallback if geographic distance failed and user has zip
        if not added and user_zip and hasattr(company, 'zip_code') and company.zip_code:
            distance = calculate_zip_distance_approximation(user_zip, company.zip_code)
            if distance <= max_distance:
                nearby_companies.append(company)

    return nearby_companies


async def fetch_google_place_rating(place_id: str) -> Optional[dict]:
    """
    Fetch rating information from Google Places API (New) for a given place ID.
    Returns a dict with rating, user_ratings_total, or None if API key not configured or request fails.
    """
    if not GOOGLE_PLACES_API_KEY:
        print("Google Places API key not configured")
        return None

    try:
        # Use Places API (New) - Place Details
        url = f"https://places.googleapis.com/v1/places/{place_id}"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask": "rating,userRatingCount"
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    result = await response.json()
                    return {
                        'rating': result.get('rating'),
                        'user_ratings_total': result.get('userRatingCount')
                    }
        return None
    except Exception as e:
        print(f"Error fetching Google Place rating: {e}")
        return None


async def search_google_place_id(business_name: str, address: str, city: str, state: str) -> Optional[str]:
    """
    Search for a business on Google Places and return its place_id.
    Returns the place_id of the best match, or None if not found.
    """
    if not gmaps_client or not GOOGLE_PLACES_API_KEY:
        print("Google Places API key not configured")
        return None

    try:
        query = f"{business_name}, {address}, {city}, {state}"
        places_result = gmaps_client.places(query=query)

        if places_result and 'results' in places_result and len(places_result['results']) > 0:
            # Return the first (best) match
            return places_result['results'][0].get('place_id')
        return None
    except Exception as e:
        print(f"Error searching for Google Place: {e}")
        return None
