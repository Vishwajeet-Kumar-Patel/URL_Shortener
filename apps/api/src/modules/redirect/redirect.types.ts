export type RedirectResolution =
  | {
      outcome: "ACTIVE";
      targetUrl: string;
      urlId: string;
      ownerId: string;
      shortCode: string;
    }
  | {
      outcome: "PAUSED";
      message: string;
    }
  | {
      outcome: "HIDDEN";
      message: string;
    }
  | {
      outcome: "DELETED";
      message: string;
    }
  | {
      outcome: "NOT_FOUND";
      message: string;
    };
