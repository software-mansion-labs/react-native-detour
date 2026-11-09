import { memoryStorage } from "../../__fixtures__/memoryStorage";

const loadModule = () => {
  let userId!: typeof import("../userId");
  jest.isolateModules(() => {
    userId = require("../userId");
  });
  return userId;
};

const noEmails = (id: string) => !id.includes("@");

beforeEach(() => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("stores the user ID and removes it with null", async () => {
  const { setUserId, getUserId, configureUserId } = loadModule();
  const { storage, items } = memoryStorage();
  configureUserId(storage);
  await getUserId();

  setUserId("u_12345");
  expect(await getUserId()).toBe("u_12345");
  expect(items.get("Detour_userId")).toBe("u_12345");

  setUserId(null);
  expect(await getUserId()).toBeNull();
  expect(items.has("Detour_userId")).toBe(false);
});

it("reads the value stored on an earlier launch", async () => {
  const { getUserId, configureUserId } = loadModule();
  configureUserId(memoryStorage({ Detour_userId: "u_12345" }).storage);

  expect(await getUserId()).toBe("u_12345");
});

it("drops a rejected value and clears the previous one", async () => {
  const { setUserId, getUserId, configureUserId, setUserIdValidator } = loadModule();
  const { storage, items } = memoryStorage();
  setUserIdValidator(noEmails);
  configureUserId(storage);
  await getUserId();

  setUserId("u_12345");
  setUserId("someone@example.com");

  expect(await getUserId()).toBeNull();
  expect(items.has("Detour_userId")).toBe(false);
});

it("rejects a value the backend would refuse", async () => {
  const { setUserId, getUserId, configureUserId } = loadModule();
  configureUserId(memoryStorage().storage);
  await getUserId();

  setUserId("u".repeat(256));
  expect(await getUserId()).toBe("u".repeat(256));

  for (const value of ["", "u".repeat(257), 12345 as unknown as string]) {
    setUserId(value);
    expect(await getUserId()).toBeNull();
  }
  expect(console.warn).toHaveBeenCalledWith(
    expect.stringContaining("must be a non-empty string of at most 256 characters"),
  );
});

it("checks a value set before DetourProvider mounted with the validator", async () => {
  const { setUserId, getUserId, configureUserId, setUserIdValidator } = loadModule();
  const { storage, items } = memoryStorage();

  setUserId("someone@example.com");
  setUserIdValidator(noEmails);
  configureUserId(storage);

  expect(await getUserId()).toBeNull();
  expect(items.has("Detour_userId")).toBe(false);
});

it("saves an accepted value set before DetourProvider mounted over the stored one", async () => {
  const { setUserId, getUserId, configureUserId } = loadModule();
  const { storage, items } = memoryStorage({ Detour_userId: "u_old" });

  setUserId("u_12345");
  configureUserId(storage);

  expect(await getUserId()).toBe("u_12345");
  expect(items.get("Detour_userId")).toBe("u_12345");
});

it("clears a stored value that a validator added in a new version rejects", async () => {
  const { getUserId, configureUserId, setUserIdValidator } = loadModule();
  const { storage, items } = memoryStorage({ Detour_userId: "someone@example.com" });

  setUserIdValidator(noEmails);
  configureUserId(storage);

  expect(await getUserId()).toBeNull();
  expect(items.has("Detour_userId")).toBe(false);
});

it("writes nothing when only the validator changes", async () => {
  const { getUserId, configureUserId, setUserIdValidator } = loadModule();
  const { storage } = memoryStorage({ Detour_userId: "u_12345" });
  configureUserId(storage);
  await getUserId();
  const setItem = jest.spyOn(storage, "setItem");

  setUserIdValidator(() => true);
  setUserIdValidator(() => true);

  expect(setItem).not.toHaveBeenCalled();
});
