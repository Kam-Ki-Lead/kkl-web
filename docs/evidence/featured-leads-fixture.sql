-- Fixtures for scripts/verify-staging-homepage.mjs.
--
-- Two eligible featured leads with contact rows attached. The contact rows are
-- the point: "no contact detail reaches the page" is only evidence when there
-- is contact detail behind the cards being shown.
--
-- A DISPOSABLE DATABASE ONLY. Never a review or staging database.
--
--   psql "$KKL_TEST_OWNER_DATABASE_URL" -f docs/evidence/featured-leads-fixture.sql
SET app.user_role = 'staff';

INSERT INTO locations (id, name, kind, status, parent_id) VALUES
  ('homecheck-a', 'Featured Check Alpha', 'locality', 'active', 'in-wb-kol'),
  ('homecheck-b', 'Featured Check Beta',  'locality', 'active', 'in-wb-kol')
ON CONFLICT (id) DO NOTHING;

-- A high qualification level sorts these to the front of the feed, which is
-- ordered qualification first. Without it they would sit behind whatever else
-- the database holds and the checks would be reading someone else's rows.
INSERT INTO leads
  (reference, status, consent_status, price_credits, first_available_at,
   location_id, property_type, budget_band, configurations, qualification_level, summary)
VALUES
  ('HOME-001', 'listed',  'granted', 1500, now() - interval '2 hours',
   'homecheck-a', 'Apartment', '50l_1cr', '{"3 BHK"}', 8000,
   'LEAKCHECK Ritu Sengupta 9830000000 12 Park Street'),
  -- Thirty days old, so the ageing policy discounts it and the card has a
  -- badge to show.
  ('HOME-002', 'on_sale', 'granted', 2000, now() - interval '30 days',
   'homecheck-b', 'Villa', '1cr_2cr', '{"4 BHK"}', 7999,
   'LEAKCHECK second private summary')
ON CONFLICT (reference) DO NOTHING;

INSERT INTO lead_contacts (lead_id, full_name, phone, email)
  SELECT id, 'Ritu Sengupta', '+919830000000', 'ritu@example.invalid'
    FROM leads WHERE reference LIKE 'HOME-%'
ON CONFLICT (lead_id) DO NOTHING;
