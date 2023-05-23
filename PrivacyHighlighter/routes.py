import logging
import validators
from flask import Blueprint, request, jsonify, json
from PrivacyHighlighter.db_models import Policy, DEFAULT_JSON
from PrivacyHighlighter.utils import check_policy_by_url, check_result_json_validity
from PrivacyHighlighter.chatgpt_integration import chatgpt_policy_request

main = Blueprint('main', __name__)

MSG_ERR_INVALID_ARG = "Invalid arguments passed to the system"
MSG_ERR_INVALID_URL = "Invalid URL passed to the system"
MSG_ERR_NO_POLICY_FOUND = "No Privacy Policy was found for this URL in our database"
MSG_ERR_INVALID_RESULT = "Our system hasn't managed to produce a valid result for the Privacy Policy"
MSG_SUCCESS = "Successful ChatGPT response"


@main.route("/")
def default_route():
    return "Hey there, if you're a user, you shouldn't be here. This space is used by the PrivacyHighlighter project :)"


@main.route("/request")
def request_route():
    if 'policy_url' not in request.args:
        return jsonify(response_type="Fail", message=MSG_ERR_INVALID_ARG, result_json=DEFAULT_JSON)

    policy_url = request.args.get('policy_url')

    try:
        policy_url = str(policy_url)
    except (TypeError, UnicodeError, AttributeError, RecursionError):
        return jsonify(response_type="Fail", message=MSG_ERR_INVALID_ARG, result_json=DEFAULT_JSON)

    if not validators.url(policy_url):
        return jsonify(response_type="Fail", message=MSG_ERR_INVALID_URL, result_json=DEFAULT_JSON)

    policy = check_policy_by_url(policy_url)
    if not policy or not policy.has_policy:
        return jsonify(response_type="Fail", message=MSG_ERR_NO_POLICY_FOUND, result_json=DEFAULT_JSON)

    gpt_result = chatgpt_policy_request(policy.policy_text)

    if not check_result_json_validity(gpt_result):
        return jsonify(response_type="Fail", message=MSG_ERR_INVALID_RESULT, result_json=DEFAULT_JSON)

    policy.update_gpt_result(gpt_result)

    return jsonify(response_type="Success", message=MSG_SUCCESS, result_json=gpt_result)
