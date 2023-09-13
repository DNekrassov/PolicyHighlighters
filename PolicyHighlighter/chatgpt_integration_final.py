import openai
from credentials import api_key
import json
import re
from transformers import pipeline
import os
import nltk
from PolicyHighlighter.config import TABLE_CONFIG_FILEPATH

os.environ["TOKENIZERS_PARALLELISM"] = "false"
# Download NLTK resources
nltk.download('punkt')

# The api_key used to interact with the chatgpt api
openai.api_key = api_key

# Read the table_config json
table_config = open(TABLE_CONFIG_FILEPATH)

# return the JSON object as a dictionary
table_data = json.load(table_config)

# Read the information categories, ways of use and values from the config_table
row_order = table_data["row_order"]
information_categories = [row['key'] for row in row_order]
categories_prompts = [row["prompt"] for row in row_order]

col_order = table_data["col_order"]
ways_of_use = [col["key"] for col in col_order]
uses_prompts = [col["prompt"] for col in col_order]

vals = ["unused", "opt in", "opt out", "used", "uncollected", "collected"]
# Define a mapping from input values to vals
value_to_val_mapping = {
    "1": "unused",
    "2": "opt in",
    "3": "opt out",
    "4": "used",
    "5": "uncollected",
    "6": "collected"
}


# split_into_paragraphs is a function that takes a text as an input and splits the text into paragraphs while
# maintaining a max length of 4000 to prevent exceeding the maximum length of the prompt
def join_paragraphs(paragraphs):
    result = []
    i = 0
    while i < len(paragraphs) - 1:
        current = ""
        while i < len(paragraphs) - 1 and len(re.findall(r'\w+', current)) < 3000:
            if len(re.findall(r'\w+', paragraphs[i])) + len(re.findall(r'\w+', current)) < 3500:
                current = current + paragraphs[i]
            else:
                result.append(current)
                current = ""
            i += 1
        result.append(current)
    return result


# Function to classify a privacy policy paragraph
def classify_paragraphs(privacy_policy_text, threshold=0.5):
    categorized_paragraphs = {category: [] for category in information_categories}

    # Preprocess the text
    paragraphs = privacy_policy_text.split("\n")

    # Check for universal paragraphs
    universal_paragraphs = []
    for paragraph in paragraphs:
        if re.search(r"(collect|share|opt-out|opt out|opt-in|opt in|opt_out|opt_in|optional|remove|choose|)", paragraph, re.IGNORECASE):
            universal_paragraphs.append(paragraph)
    # Load pre-trained language model
    model_name = "bert-base-uncased"
    nlp = pipeline("text-classification", model=model_name)

    # Categorize the paragraphs using the pre-trained language model
    for paragraph in paragraphs:
        # # Tokenize the input text
        # input_ids = tokenizer.encode(paragraph, add_special_tokens=True, truncation=True, max_length=512, padding=True, return_tensors="pt")
        #
        # # Make a prediction
        # with torch.no_grad():
        #     outputs = model(input_ids)

        if re.search(r"\b(phone|email|contact|contact details|address)\b", paragraph, re.IGNORECASE):
            categorized_paragraphs["contacts"].append(paragraph)
        elif re.search(r"\b(cookie|tracking|web cookies|cookie information|cookie policy)\b", paragraph, re.IGNORECASE):
            categorized_paragraphs["cookies"].append(paragraph)
        elif re.search(
                r"\b(age|gender|location|demographic|race|residence|martial statuc|postal code|household size|occupation|education|location)\b",
                paragraph, re.IGNORECASE):
            categorized_paragraphs["demographics"].append(paragraph)
        elif re.search(r"\b(health|medical|healthcare|wellnes|health insurance|patient)\b", paragraph, re.IGNORECASE):
            categorized_paragraphs["health_info"].append(paragraph)
        elif re.search(r"\b(preference|privacy settings|)\b", paragraph, re.IGNORECASE):
            categorized_paragraphs["preferences"].append(paragraph)
        elif re.search(r"\b(purchase|transaction|billing|shipping|coupons|pay|purchasing)\b", paragraph, re.IGNORECASE):
            categorized_paragraphs["purchases"].append(paragraph)
        elif re.search(r"\b(credit|card|pay)\b", paragraph, re.IGNORECASE):
            categorized_paragraphs["credit_card_info"].append(paragraph)
        elif re.search(r"\b(social|security|number|id)\b", paragraph, re.IGNORECASE):
            categorized_paragraphs["social_security"].append(paragraph)
        # elif  re.search(r"\b(government id|id)\b", paragraph, re.IGNORECASE):
        #     categorized_paragraphs["gov_id"].append(paragraph)
        elif re.search(r"\b(activity|log|web log|pages|visit|session|search|history|interaction)\b", paragraph, re.IGNORECASE):
            categorized_paragraphs["site_activity"].append(paragraph)
        # elif  re.search(r"\b(location)\b", paragraph, re.IGNORECASE):
        #     categorized_paragraphs["location"].append(paragraph)
    # Add universal paragraphs to all categories
    for category in categorized_paragraphs.keys():
        categorized_paragraphs[category].extend(universal_paragraphs)

    return categorized_paragraphs


# Function to send a prompt to the OpenAI API and get a response
def query_gpt(prompt):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo-16k",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user",
             "content": "i'm interested in analyzing privacy policies, so i'll be providing you with paragraphs of the privacy policy of a website to determine if the sex statements are true or not regarding different information categories and different ways of using the information, depending on the information in the paragraph answer for each one of the statements if it is true or not."
                        "i'll be providing each time a paragraph, an information category , and a way of use."
                        "the sex statements are :"
                        "1.'The website collects user data about the information category but doesn’t use it for the way of use'."
                        "2.'By default, this website collects user data about the information category but doesn't use it for the way of use unless you opt in'."
                        "3.'By default, this website collects user data about the information category and uses it for the way of use, unless you opt out,meaning that the user data that the website store about the information category can be removed by the user'"
                        "4.'The website collects user data about the information category and uses it for the way of use'."
                        "5.'The website doesn't collect user data about the information category at all'"
                        "6.'The website collects user data about the information category"
                        "please answer only in the following syntax without any extra text:"
                        "the number of the statement(1/2/3/4/5/6) + ':' + the word 'yes' if the statement is true, "
                        "the word 'no' if the statement is false , and 'not stated' if the paragraph doesn't "
                        "contain relevant information to determine if the statement is true or not."},
            {"role": "assistant", "content": "I'll be happy to help you analyze the privacy policies. Please provide "
                                             "me with the first paragraph of the privacy policy, the information "
                                             "category, and the way of use so that I can determine if the statements "
                                             "are true or not."},
            {"role": "user", "content": prompt}
        ]
    )
    return response['choices'][0]['message']['content']


def chatgpt_policy_request(privacy_policy_text):
    """
    Gets the Privacy Policy text and returns a JSON with the table parameters

    Parameters
    ------------
    privacy_policy_text: str
        The entire Privacy Policy text in a string format
    """
    # Split the privacy policy into paragraphs
    categorized_paragraphs = classify_paragraphs(privacy_policy_text)
    paragraphs = {category: [] for category in information_categories}
    for category in categorized_paragraphs:
        paragraph = join_paragraphs(categorized_paragraphs[category])
        paragraphs[category].extend(paragraph)

    # for each category, if the website does collect data, we want to know the ways of use for the collected data.
    prompt_results = {category: {use: {val: set() for val in vals} for use in ways_of_use} for category in information_categories}

    # Process each paragraph again to extract information about ways of using the collected data
    for category, category_prompt in zip(information_categories, categories_prompts):
        for paragraph in paragraphs[category]:
            # Check if the website collects data about the current category
            for use, use_prompt in zip(ways_of_use, uses_prompts):
                # Define prompts for each state
                prompt = f"the paragraph:{paragraph}." \
                         f"the information category:{category_prompt}" \
                         f"the way of use: {use_prompt}"
                response = query_gpt(prompt).lower()
                answer_to_statements = response.split('\n')
                print(answer_to_statements)
                for line in answer_to_statements:
                    contains_numeric = any(char.isnumeric() for char in line)
                    if not contains_numeric:
                        break
                    if len(line) > 23:
                        print("in")
                        prompt = f"reanswer the previous prompt with only the number of the statemnt+':' + yes or no or not stated depending on the statement. i want the response text to only include the numbers of the statements, without any extra words but yes/no/not stated"
                        response = query_gpt(prompt).lower()
                        answer_to_statements = response.split('\n')
                for line in answer_to_statements:
                    contains_numeric = any(char.isnumeric() for char in line)
                    if not contains_numeric:
                        break
                    print(line, "\n")
                    parts = []
                    if ":" in line:
                        parts = line.split(': ')
                        if len(parts) == 1:
                            parts = line.split(":")
                    if "." in line:
                        parts = line.split('. ')
                        if len(parts) == 1:
                            parts = line.split(".")
                    print(parts, "\n")
                    statement_number, statement_val = parts
                    # Extract the numeric part from statement_number using regular expressions
                    numeric_part = re.search(r'\d+', statement_number)
                    if numeric_part:
                        val = value_to_val_mapping.get(numeric_part.group(0))  # Use the numeric part for mapping
                        if val:
                            prompt_results[category][use][val].add(statement_val)
    print(prompt_results)
    results = {category: {use: [] for use in ways_of_use} for category in information_categories}
    for category in prompt_results:
        collected_status = None
        for use in prompt_results[category]:
            if "yes" in prompt_results[category][use]["collected"]:
                collected_status = True
        for use in prompt_results[category]:
            if "yes" in prompt_results[category][use]["opt in"] and collected_status:
                results[category][use] = "opt in"
            elif "yes" in prompt_results[category][use]["opt out"] and collected_status:
                results[category][use] = "opt out"
            elif "yes" in prompt_results[category][use]["used"] and collected_status:
                results[category][use] = "used"
            elif "yes" in prompt_results[category][use]["unused"] and collected_status:
                results[category][use] = "unused"
            elif "no" in prompt_results[category][use]["unused"] and collected_status:
                results[category][use] = "used"
            elif "no" in prompt_results[category][use]["used"] and collected_status:
                results[category][use] = "unused"
            elif collected_status:
                results[category][use] = "unused"
            else:
                results[category][use] = "uncollected"

    results_as_json = json.dumps(results)
    print(results_as_json)
    return results_as_json
