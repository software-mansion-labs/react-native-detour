let customerUserId: string | undefined;

export const setUserId = (id: string | null): void => {
  customerUserId = id ?? undefined;
};

export const getUserId = (): string | undefined => customerUserId;
