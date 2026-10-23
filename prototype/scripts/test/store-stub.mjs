// A stand-in for js/store.js for render tests: a signed-in owner with one puppy and a diet, nothing saved anywhere.
const day = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
export const pet = { id: 'test-pet', name: 'Testy', species: 'dog', breed: 'Labrador Retriever', sizeCat: 'V', sex: 'male', neutered: true, bcs: 5, activity: 'normal', birth: day(200), weightKg: 18, allergies: [], health: [], answered: { bcs: true },
  logs: [{ on: day(60), kg: 11, bcs: 5 }, { on: day(30), kg: 14.5, bcs: 5 }, { on: day(2), kg: 18, bcs: 5 }], skips: [], goalHistory: [],
  diet: [{ id: 'd1', foodId: null, foodName: 'Test kibble', role: 'main', amount: 2, unit: 'cup', timesPerDay: 2, startedOn: day(20), endedOn: null, kcalPerUnit: 350 }] };
const none = () => {};
export const REGIONS = [['US', 'United States'], ['CA', 'Canada']];
export const isSignedIn = () => true;
export const getPet = () => pet; export const getPets = () => [pet]; export const getDiet = () => pet.diet; export const getGoalHistory = () => [];
export const getAccount = () => ({ email: 'test@example.com' }); export const getProfile = () => ({ email_reminders: false });
export const getRegion = () => 'US'; export const hasRegion = () => true; export const getSaved = () => [];
export const getQuickPet = () => null; export const peekQuickPet = () => null;
// the catalogue the tests use: set by the test from the same data calc ranks (see render-screens.mjs)
const cat = () => globalThis.__catalog || { foods: [], treats: [], supplements: [] };
const display = (f) => ({ img: '/assets/food.webp', rating: 0, reviews: 0, rebuy: 0, subscribe: 0, source: 'test', ...f });
export const listFoods = () => cat().foods.map(display); export const listTreats = () => cat().treats.map(display); export const listSupplements = () => cat().supplements.map(display); export const getFood = (id) => listFoods().find((f) => f.id === id) || null;
export const listReviews = () => []; export const listRecentReviews = () => [];
export const updatePet = none; export const savePet = none; export const removePet = none; export const setActivePet = none; export const addWeighIn = none; export const changeDiet = () => ({ ok: true });
export const setGoal = none; export const clearGoal = none; export const setDietKcal = none; export const undoDietChange = none; export const setEmailReminders = none; export const setRegion = none; export const setQuickPet = none;
export const addReview = none; export const toggleSaved = none; export const deleteMyData = none; export const signOut = none; export const googleSignInUrl = () => '#';
export const findFoodByBarcode = async () => null; export const logInWithPassword = none; export const signUpWithPassword = none; export const requestPasswordReset = none; export const setNewPassword = none;
export const takeAuthNotice = () => null; export const takeRecovery = () => null;
