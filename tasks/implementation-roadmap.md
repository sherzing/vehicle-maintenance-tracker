# Vehicle Maintenance Tracker - Implementation Roadmap

## Milestone 1: Foundation ✅ COMPLETE
- [x] Set up project foundation (Vite + React + Firebase SDK)
- [x] Configure Firebase project (Firestore + Auth)
- [x] Add testing infrastructure (Vitest + React Testing Library)

## Milestone 2: Auth & Teams
- [ ] Implement Google Authentication and user session
- [ ] Build team creation and team membership features

## Milestone 3: Vehicles
- [ ] Create vehicle CRUD operations (add, view, edit, delete)
- [ ] Implement vehicle list and detail views with basic UI

## Milestone 4: Maintenance Items
- [ ] Build maintenance item management (add, edit, delete items)
- [x] Implement status calculation logic (usage + time intervals) ⚠️ PARTIALLY DONE (logic implemented, UI pending)

## Milestone 5: Tracking Features
- [ ] Create usage update feature with dual storage (current + history)
- [ ] Build service logging with conditional schedule updates

## Milestone 6: Dashboard & UX
- [x] Implement 10% warning threshold and color-coded status display ⚠️ PARTIALLY DONE (logic implemented, UI pending)
- [ ] Create dashboard with vehicle overview and status indicators

## Milestone 7: Polish
- [ ] Add race number field and display to vehicle management
- [x] Handle edge cases (never-serviced items, historical services) ⚠️ PARTIALLY DONE (logic handles edge cases, UI pending)
- [ ] Implement responsive UI (mobile + desktop layouts)
- [ ] Add form validation and error handling throughout app

## Milestone 8: Launch
- [ ] Configure Firestore security rules for team-based access
- [ ] Test complete user flows (auth → teams → vehicles → maintenance)
- [ ] Deploy to Firebase Hosting and verify production build

---

**Current Status:** Milestone 1 Complete, Milestone 2 Ready to Start
**Completed:** 3/20 tasks (15%)
**Partially Complete:** 3 tasks (business logic done, UI integration pending)
**MVP Target:** Milestone 6 (Dashboard & UX)
**Nice-to-Have:** Milestones 7-8

## Recent Progress

- ✅ Project initialized with Vite + React + Firebase SDK
- ✅ Firebase configuration ready (awaiting user credentials)
- ✅ Testing infrastructure fully operational (Vitest + RTL)
- ✅ Core status calculation logic implemented and tested (21 tests passing)
- 📋 Ready to begin Google Authentication implementation
