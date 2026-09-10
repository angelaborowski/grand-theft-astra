import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useGameAudio } from "./use-game-audio";
import { saveFirstStartPlayed } from "../models/first-start";
import { ConnectionError, actionErrorMessage } from "../../../lib/world-connection";
import {
  newSession,
  savedSession,
  savedSessionQuery,
  sessionQuery,
  worldQueryKey,
} from "../queries/world-queries";

/** Entry keeps saved identity on the server and starts only after session creation completes. */
export function useGameEntry() {
  const [started, setStarted] = useState(false);
  const client = useQueryClient();
  const { audio } = useGameAudio();
  const saved = useQuery({
    ...savedSessionQuery,
    enabled: !started && typeof window !== "undefined",
  });
  const start = useMutation({
    mutationFn: async (mode: "new" | "continue") => {
      const session = await (mode === "new" ? newSession() : savedSession());
      if (session === null)
        throw new ConnectionError("No saved game is available. Start a new game.");
      return session;
    },
    retry: false,
    onSuccess: (session, mode) => {
      if (mode === "new") {
        saveFirstStartPlayed(false);
        audio?.resetFirstStart();
      }
      client.removeQueries({ queryKey: worldQueryKey });
      client.removeQueries({ queryKey: ["conversation"] });
      client.setQueryData(sessionQuery.queryKey, session);
      client.setQueryData(savedSessionQuery.queryKey, session);
      setStarted(true);
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: savedSessionQuery.queryKey });
    },
  });
  const notice = start.isError
    ? actionErrorMessage(start.error)
    : saved.isError
      ? actionErrorMessage(saved.error)
      : null;
  return {
    started,
    pending: start.isPending,
    canContinue: saved.isSuccess && saved.data !== null,
    notice,
    actions: {
      newGame: () => {
        if (!start.isPending) start.mutate("new");
      },
      continueGame: () => {
        if (!start.isPending) start.mutate("continue");
      },
      leave: () => {
        start.reset();
        setStarted(false);
      },
    },
  };
}
