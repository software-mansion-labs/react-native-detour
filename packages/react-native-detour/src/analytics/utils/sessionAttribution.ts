// In memory on purpose: a cold start without a link starts unattributed.
let sessionClickId: string | null = null;

export const setSessionClickId = (clickId: string | null) => {
  sessionClickId = clickId;
};

export const getSessionClickId = () => sessionClickId;
