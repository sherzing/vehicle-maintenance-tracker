# Vehicle Maintenance Tracker - Implementation Roadmap

## Milestone 1: Foundation
- [ ] Set up project foundation (Vite + React + Firebase SDK)
- [ ] Configure Firebase project (Firestore + Auth)

## Milestone 2: Auth & Teams
- [ ] Implement Google Authentication and user session
- [ ] Build team creation and team membership features

## Milestone 3: Vehicles
- [ ] Create vehicle CRUD operations (add, view, edit, delete)
- [ ] Implement vehicle list and detail views with basic UI

## Milestone 4: Maintenance Items
- [ ] Build maintenance item management (add, edit, delete items)
- [ ] Implement status calculation logic (usage + time intervals)

## Milestone 5: Tracking Features
- [ ] Create usage update feature with dual storage (current + history)
- [ ] Build service logging with conditional schedule updates

## Milestone 6: Dashboard & UX
- [ ] Implement 10% warning threshold and color-coded status display
- [ ] Create dashboard with vehicle overview and status indicators

## Milestone 7: Polish
- [ ] Add race number field and display to vehicle management
- [ ] Handle edge cases (never-serviced items, historical services)
- [ ] Implement responsive UI (mobile + desktop layouts)
- [ ] Add form validation and error handling throughout app

## Milestone 8: Launch
- [ ] Configure Firestore security rules for team-based access
- [ ] Test complete user flows (auth → teams → vehicles → maintenance)
- [ ] Deploy to Firebase Hosting and verify production build

---

**Current Status:** Not started
**MVP Target:** Milestone 6 (Dashboard & UX)
**Nice-to-Have:** Milestones 7-8
