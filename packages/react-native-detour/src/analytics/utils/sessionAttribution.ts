// In memory on purpose: a cold start without a link starts unattributed.
let sessionClickId: string | null = null;

export const setSessionClickId = (clickId: string) => {
  sessionClickId = clickId;
};

export const clearSessionClickId = () => {
  sessionClickId = null;
};

export const getSessionClickId = () => sessionClickId;
