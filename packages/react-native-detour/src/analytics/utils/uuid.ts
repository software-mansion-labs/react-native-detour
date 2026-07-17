// Math.random()-based RFC4122 v4 UUID. Sufficient
// for both consumers: device_id is compared across a huge population, but even
// non-cryptographic 122 bits of randomness makes a collision practically
// impossible; session_id never leaves a single device, so collision risk is a
// non-issue there.
export const generateUUID = (): string =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    if (char === "x") return random.toString(16);
    return (8 + (random % 4)).toString(16);
  });
