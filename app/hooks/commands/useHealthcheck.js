import { useEffect, useRef, useState, useCallback } from "react";

import { Command } from "./command";

const useHealthcheck = (peripheral, sendCommandRequest, onFailure) => {
  const HEALTHCHECK_CADENCE = 1000;
  const MAX_FAILED_CONSECTUIVE_HEALTHCHECKS = 3;
  const [numFailed, setNumFailed] = useState(0);
  const [healthcheckInterval, setHealthcheckInterval] = useState(null);
  const send = useRef(null);

  const tryHealthcheck = useCallback(async () => {
    try {
      await send.current(Command.HEALTHCHECK);
      setNumFailed(0);
    } catch (err) {
      setNumFailed((prevNumFailed) => prevNumFailed + 1);
    }
  }, []);

  useEffect(() => {
    send.current = sendCommandRequest;
  }, [sendCommandRequest]);

  useEffect(() => {
    if (peripheral && !healthcheckInterval) {
      tryHealthcheck();
      const hbID = setInterval(tryHealthcheck, HEALTHCHECK_CADENCE);
      setHealthcheckInterval(hbID);
    } else if (!peripheral && healthcheckInterval) {
      setHealthcheckInterval(clearInterval(healthcheckInterval));
    }
  }, [peripheral, healthcheckInterval]);

  // Fail on 3 consecutive failed healthcheck
  useEffect(() => {
    if (numFailed >= MAX_FAILED_CONSECTUIVE_HEALTHCHECKS) {
      setHealthcheckInterval(clearInterval(healthcheckInterval));
      setNumFailed(0);
      onFailure(peripheral, "failed device healthcheck");
    }
  }, [peripheral, numFailed, healthcheckInterval]);
};

export default useHealthcheck;
