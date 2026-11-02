import type { DetourStorage } from "../../links/types";

const memoryStorage = () => {
  const items = new Map<string, string>();
  const storage: DetourStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
  return { storage, items };
};

const loadModule = () => {
  let userId!: typeof import("../userId");
  jest.isolateModules(() => {
    userId = require("../userId");
  });
  return userId;
};

it("stores the user ID and removes it with null", async () => {
  const { setUserId, getUserId, configureUserId } = loadModule();
  const { storage, items } = memoryStorage();
  configureUserId(storage);

  setUserId("u_12345");
  expect(await getUserId()).toBe("u_12345");
  expect(items.get("Detour_userId")).toBe("u_12345");

  setUserId(null);
  expect(await getUserId()).toBeNull();
  expect(items.has("Detour_userId")).toBe(false);
});

it("saves a value set before DetourProvider mounted", async () => {
  const { setUserId, configureUserId } = loadModule();
  const { storage, items } = memoryStorage();

  setUserId("u_12345");
  configureUserId(storage);

  expect(items.get("Detour_userId")).toBe("u_12345");
});

it("drops a rejected value and clears the previous one", async () => {
  const { setUserId, getUserId, configureUserId } = loadModule();
  const { storage, items } = memoryStorage();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  configureUserId(storage, (id) => !id.includes("@"));

  setUserId("u_12345");
  setUserId("someone@example.com");

  expect(await getUserId()).toBeNull();
  expect(items.has("Detour_userId")).toBe(false);
});
