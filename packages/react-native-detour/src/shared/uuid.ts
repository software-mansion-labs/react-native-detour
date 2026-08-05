export const generateUUID = (): string =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    if (char === "x") return random.toString(16);
    return (8 + (random % 4)).toString(16);
  });
