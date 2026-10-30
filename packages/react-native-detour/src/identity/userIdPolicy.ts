// PROVISIONAL: accepts every value until it is decided whether the SDK itself rejects
// values that look like e-mail addresses or phone numbers.
export const isUserIdAllowed = (_userId: string): boolean => true;
