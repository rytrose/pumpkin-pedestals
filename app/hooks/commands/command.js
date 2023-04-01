// Indicates whether a command is a request or a response
export const CommandType = {
  REQUEST: "0",
  RESPONSE: "1",
};

// Enumerates the available commands
export const Command = {
  HEALTHCHECK: 0,
  GET_PEDESTALS: 1,
  SET_PEDESTALS_COLOR: 2,
};

// Converts an integer into a 2 character hex string, mod 256
export const intToAsciiHexByte = (i) => {
  return ("00" + i.toString(16)).slice(-2);
};

// Manages pending and removing command response callbacks
export const commandReducer = (state, action) => {
  switch (action.type) {
    case "pend_request":
      const newState = {
        ...state,
      };
      newState[action.id] = action.callback;
      return newState;
    case "clear_request":
      return Object.fromEntries(
        Object.entries(state).filter(([key]) => key !== action.id)
      );
  }
};

// Parses an ID-command-data packet
export const parseCommand = (raw) => {
  const rawSplit = raw.split("|");
  const rawID = rawSplit[0];
  const id = rawID.slice(1);
  const commandType = rawID[0];
  const commandID = rawSplit[1];
  const command = parseInt(commandID, 16);
  const rawData = rawSplit[2];
  let data;
  if (!rawData.includes("#")) {
    data = rawData.length > 0 ? [rawData] : [];
  } else {
    data = rawData.split("#");
  }
  return [commandType, id, command, data];
};
