import logging
import validators
from flask import Blueprint, request, jsonify, json
from PolicyHighlighter.db_models import Policy
from PolicyHighlighter.utils import check_policy_by_url, check_result_json_validity, response_jsonify
# from PolicyHighlighter.chatgpt_integration_base import chatgpt_policy_request
from PolicyHighlighter.chatgpt_integration_final import chatgpt_policy_request
from PolicyHighlighter.status import Status
from PolicyHighlighter.config import DEFAULT_JSON, TEST_JSON

main = Blueprint('main', __name__)


@main.route("/")
def default_route():
    return "Hey there, if you're a user, you shouldn't be here. This space is used by the PolicyHighlighter project :)"


@main.route("/request")
def request_route():
    if 'policy_url' not in request.args:
        return response_jsonify(message=Status.MSG_ERR_INVALID_ARG, table=DEFAULT_JSON)

    policy_url = request.args.get('policy_url')

    # if not validators.url(policy_url):
    #    return response_jsonify(message=Status.MSG_ERR_INVALID_URL, table=DEFAULT_JSON)

    policy = check_policy_by_url(policy_url)

    if not policy or not policy.has_policy:
        return response_jsonify(message=Status.MSG_ERR_NO_POLICY_FOUND, table=DEFAULT_JSON)

    if policy.has_result:
        result = json.loads(policy.gpt_result)
        return response_jsonify(message=Status.MSG_SUCCESS, table=result, policy=policy)

    # else, parse result through ChatGPT
    gpt_result = chatgpt_policy_request(policy.policy_text)

    # if not check_result_json_validity(gpt_result):
    #     #return response_jsonify(message=Status.MSG_ERR_INVALID_RESULT, table=DEFAULT_JSON, policy=policy)
    #     return response_jsonify(message=Status.MSG_SUCCESS, table=TEST_JSON, policy=policy)

    policy.update_gpt_result(gpt_result)

    result = json.loads(policy.gpt_result)

    return response_jsonify(message=Status.MSG_SUCCESS, table=result, policy=policy)
