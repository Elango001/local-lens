from datetime import datetime, timedelta
from app.database import Base, engine, SessionLocal
from app.models.user import User, UserRole
from app.models.business import Business, BusinessStatus
from app.models.offer import Offer, DiscountType, OfferStatus
from app.models.report import Report, ReportReason, ReportStatus
from app.core.security import get_password_hash

def seed_database(force_refresh: bool = False):
    if force_refresh:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        admin = db.query(User).filter(User.email == "admin@locallens.com").first()
        if admin and not force_refresh:
            print("Database already contains admin user. Skipping seed.")
            return

        print("Seeding database with updated admin, merchants, registered businesses, and 24h grace reports...")

        # 1. Admin User
        admin_user = User(
            email="admin@locallens.com",
            hashed_password=get_password_hash("admin123"),
            full_name="LocalLens Platform Admin",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin_user)

        # 2. Merchants
        merchant_1 = User(
            email="owner.sarah@harvestkitchen.com",
            hashed_password=get_password_hash("merchant123"),
            full_name="Sarah Jenkins",
            role=UserRole.MERCHANT,
            is_active=True,
        )
        merchant_2 = User(
            email="owner.raj@techhaven.com",
            hashed_password=get_password_hash("merchant123"),
            full_name="Rajesh Kumar",
            role=UserRole.MERCHANT,
            is_active=True,
        )
        merchant_3 = User(
            email="owner.elena@luxestudio.com",
            hashed_password=get_password_hash("merchant123"),
            full_name="Elena Rostova",
            role=UserRole.MERCHANT,
            is_active=True,
        )
        merchant_4 = User(
            email="owner.marcus@urbanstyle.com",
            hashed_password=get_password_hash("merchant123"),
            full_name="Marcus Vance",
            role=UserRole.MERCHANT,
            is_active=True,
        )
        db.add_all([merchant_1, merchant_2, merchant_3, merchant_4])
        db.flush()

        # 3. Registered Businesses across the web
        b1 = Business(
            owner_id=merchant_1.id,
            name="Harvest Artisanal Bakery & Cafe",
            category="Restaurant & Cafe",
            description="Specialty sourdough breads, organic coffee, and fresh pastries baked daily.",
            address="42 Elm Street, Downtown",
            city="Springfield",
            latitude=37.7749,
            longitude=-122.4194,
            phone="+1-555-019-4821",
            email="contact@harvestkitchen.com",
            website="https://harvestbakery.local",
            status=BusinessStatus.PENDING,
            tax_or_license_number="FSSAI-984321049",
            verification_documents="https://storage.locallens.local/docs/harvest_fssai_cert.pdf",
            verification_notes="Awaiting admin verification of municipal health permit.",
        )

        b2 = Business(
            owner_id=merchant_2.id,
            name="TechHaven Gadgets & Repairs",
            category="Electronics & Retail",
            description="Certified smartphone, tablet, and laptop hardware repair center with genuine parts.",
            address="108 West Market Plaza, Suite 4",
            city="Springfield",
            latitude=37.7833,
            longitude=-122.4167,
            phone="+1-555-018-9210",
            email="support@techhaven.local",
            website="https://techhaven.local",
            status=BusinessStatus.VERIFIED,
            tax_or_license_number="GSTIN-33AAACP2341P1Z5",
            verification_documents="https://storage.locallens.local/docs/techhaven_gst_trade.pdf",
            verification_notes="Verified against state merchant registry on Nov 10, 2026.",
            verified_at=datetime.utcnow() - timedelta(days=9),
        )

        b3 = Business(
            owner_id=merchant_3.id,
            name="Luxe Hair & Spa Lounge",
            category="Services & Beauty",
            description="Modern hair styling, organic facial treatments, and therapeutic massage spa.",
            address="77 Grand Avenue, Level 2",
            city="Springfield",
            latitude=37.7690,
            longitude=-122.4467,
            phone="+1-555-014-5566",
            email="bookings@luxestudio.local",
            website="https://luxestudio.local",
            status=BusinessStatus.VERIFIED,
            tax_or_license_number="TRADE-SALON-7781",
            verification_documents="https://storage.locallens.local/docs/luxe_cosmetology_board.pdf",
            verification_notes="Board of Cosmetology franchise license verified.",
            verified_at=datetime.utcnow() - timedelta(days=14),
        )

        b4 = Business(
            owner_id=merchant_1.id,
            name="Midnight Munchies Dark Kitchen",
            category="Restaurant & Cafe",
            description="Late night comfort food delivery only.",
            address="12 Alleyway Crescent",
            city="Springfield",
            latitude=37.7600,
            longitude=-122.4100,
            phone="+1-555-011-3322",
            email="midnight@food.local",
            status=BusinessStatus.REJECTED,
            tax_or_license_number="TEMP-NONE",
            verification_documents="No official documentation provided.",
            verification_notes="Rejected: Commercial zoning permit missing; registered to residential property.",
        )

        b5 = Business(
            owner_id=merchant_2.id,
            name="Peak Performance Fitness Studio",
            category="Health & Fitness",
            description="Strength training, high-intensity functional fitness, and nutrition counseling.",
            address="500 Bayview Parkway",
            city="Oakland",
            latitude=37.7550,
            longitude=-122.3900,
            phone="+1-555-017-7788",
            email="join@peakfitness.local",
            website="https://peakfitness.local",
            status=BusinessStatus.PENDING,
            tax_or_license_number="FIT-REG-9912",
            verification_documents="https://storage.locallens.local/docs/peak_lease_trainer_certs.pdf",
            verification_notes="Submitted trade permit & certified trainer licenses for review.",
        )

        b6 = Business(
            owner_id=merchant_4.id,
            name="Urban Trendz Streetwear & Apparel",
            category="Retail & Fashion",
            description="Curated streetwear, sneakers, and sustainable clothing brands for men and women.",
            address="240 Union Square, Block B",
            city="San Francisco",
            latitude=37.7879,
            longitude=-122.4075,
            phone="+1-555-013-4411",
            email="info@urbantrendz.local",
            website="https://urbantrendz.local",
            status=BusinessStatus.VERIFIED,
            tax_or_license_number="CA-RETAIL-449102",
            verification_documents="https://storage.locallens.local/docs/urban_sellers_permit.pdf",
            verification_notes="California seller permit and physical store lease verified.",
            verified_at=datetime.utcnow() - timedelta(days=5),
        )

        db.add_all([b1, b2, b3, b4, b5, b6])
        db.flush()

        # 4. Offers
        now = datetime.utcnow()
        o1 = Offer(
            business_id=b1.id,
            title="Weekend Brunch Buffet: 25% Off",
            description="Enjoy 25% off our weekend brunch buffet featuring fresh sourdough bakes and artisan coffees.",
            discount_type=DiscountType.PERCENTAGE,
            discount_value="25% Off",
            terms_and_conditions="Valid Saturdays & Sundays only. Minimum table size 2 people.",
            start_date=now - timedelta(days=2),
            end_date=now + timedelta(days=12),
            is_paused=True,
            status=OfferStatus.FLAGGED, # Paused because 24h grace period elapsed without merchant action!
        )

        o2 = Offer(
            business_id=b2.id,
            title="Free Tempered Glass Screen Guard with any Screen Repair",
            description="Get a high-grade 9H tempered glass screen protector installed at zero cost.",
            discount_type=DiscountType.BOGO,
            discount_value="Free Screen Guard ($25 Value)",
            terms_and_conditions="Subject to glass availability for specific device model.",
            start_date=now - timedelta(days=5),
            end_date=now + timedelta(days=25),
            is_paused=False,
            status=OfferStatus.ACTIVE, # Active with 24h grace period running!
        )

        o3 = Offer(
            business_id=b3.id,
            title="50% Off First Aromatherapy Massage",
            description="Relax with a 60-minute full body aromatherapy massage at half price.",
            discount_type=DiscountType.PERCENTAGE,
            discount_value="50% Off",
            terms_and_conditions="First time clients only. Prior booking required.",
            start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=20),
            is_paused=False,
            status=OfferStatus.ACTIVE,
        )

        o4 = Offer(
            business_id=b6.id,
            title="Buy 2 Get 1 Free on All Graphic Tees",
            description="Mix and match any designer streetwear graphic tees.",
            discount_type=DiscountType.BOGO,
            discount_value="Buy 2 Get 1 Free",
            terms_and_conditions="Discount applies to the item of equal or lesser value.",
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=14),
            is_paused=False,
            status=OfferStatus.ACTIVE,
        )

        o5 = Offer(
            business_id=b2.id,
            title="Student & Educator 15% Off Laptop Battery Replacement",
            description="Upgrade your battery life with genuine certified cells and instant same-day turnaround.",
            discount_type=DiscountType.PERCENTAGE,
            discount_value="15% Off",
            terms_and_conditions="Valid student or faculty ID required at drop-off.",
            start_date=now - timedelta(days=2),
            end_date=now + timedelta(days=30),
            is_paused=False,
            status=OfferStatus.ACTIVE,
        )

        o6 = Offer(
            business_id=b6.id,
            title="Flat $30 Off Premium Japanese Denim",
            description="Save $30 on all raw and selvedge denim cuts when you spend $100 or more.",
            discount_type=DiscountType.FLAT,
            discount_value="$30 Off",
            terms_and_conditions="Minimum spend of $100 before tax. One voucher per customer.",
            start_date=now - timedelta(days=3),
            end_date=now + timedelta(days=18),
            is_paused=False,
            status=OfferStatus.ACTIVE,
        )

        db.add_all([o1, o2, o3, o4, o5, o6])
        db.flush()

        # 5. Customer Reports with 24h Grace Period & Resolution Flow
        # Case A: Submitted 30 hours ago, merchant did not respond -> AUTO TAKEN DOWN
        r1 = Report(
            offer_id=o1.id,
            business_id=b1.id,
            reporter_email="alex.customer@gmail.com",
            reason=ReportReason.REFUSED_OFFER,
            description="Cashier claimed 25% discount only applies before 11 AM, but terms state all weekend.",
            grace_period_hours=24,
            auto_taken_down=True,
            merchant_notified=True,
            merchant_response=None,
            status=ReportStatus.AUTO_TAKEN_DOWN,
            admin_notes="Auto-taken down: 24h grace period expired without merchant action.",
            created_at=now - timedelta(hours=30),
        )

        # Case B: Submitted 5 hours ago -> ACTIVE 24H GRACE PERIOD (19 hours left!)
        r2 = Report(
            offer_id=o2.id,
            business_id=b2.id,
            reporter_email="priya.gadgets@gmail.com",
            reason=ReportReason.INACCURATE_INFO,
            description="Store was out of stock for iPhone 15 Pro screen protectors today.",
            grace_period_hours=24,
            auto_taken_down=False,
            merchant_notified=True,
            merchant_response=None,
            status=ReportStatus.PENDING,
            created_at=now - timedelta(hours=5),
        )

        # Case C: Resolved by merchant in direct dialog with customer
        r3 = Report(
            offer_id=o3.id,
            business_id=b3.id,
            reporter_email="marcus.relax@gmail.com",
            reason=ReportReason.REFUSED_OFFER,
            description="Receptionist initially didn't know about the 50% first-time discount code.",
            grace_period_hours=24,
            auto_taken_down=False,
            merchant_notified=True,
            merchant_response="Called customer directly and honored the 50% discount with a bonus massage session. Issue resolved.",
            status=ReportStatus.MERCHANT_RESOLVED,
            admin_notes="Merchant confirmed resolution with customer.",
            created_at=now - timedelta(days=2),
            resolved_at=now - timedelta(days=1),
        )

        db.add_all([r1, r2, r3])
        db.commit()
        print("Database seeded with 24h grace period report cases!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    force = "--force" in sys.argv
    seed_database(force_refresh=force)
