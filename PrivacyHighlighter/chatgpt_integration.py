import openai
from PrivacyHighlighter.credentials import api_key
from PrivacyHighlighter.config import DEFAULT_JSON
from flask import jsonify

openai.api_key = api_key


def chatgpt_policy_request(policy_text):
    """
    Gets the Privacy Policy text and returns a JSON with the table parameters

    Parameters
    ------------
    policy_text: str
        The entire Privacy Policy text in a string format
    """

    return DEFAULT_JSON
