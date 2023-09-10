from enum import Enum

class Status(str, Enum):
    MSG_SUCCESS = 0
    MSG_ERR_INVALID_ARG = 1
    MSG_ERR_INVALID_URL = 2
    MSG_ERR_NO_POLICY_FOUND = 3
    MSG_ERR_INVALID_RESULT = 4
    MSG_IN_PROCESS = 5