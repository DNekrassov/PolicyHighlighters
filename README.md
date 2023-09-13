https://drive.google.com/file/d/1vLGmBt9sHL7bQv56nIwulNf6qGv0dEap/view?usp=sharing

# Policy Highlighters Project

In order to currently be able to execute our tool, follow the directions below:

## Dependencies
We assume the following is true regarding your system:
1. Your operating system is preferably Windows 10, although some partial tests have shown it can run on Linux too.
2. Google Chrome is installed
	* If Google Chrome is not installed, install it by downloading the installer at [https://www.google.com/chrome/](https://www.google.com/chrome/) and following the installation instructions.
3. Python 3.10.0 is installed
4. localhost:5000 is not blocked by another application
5. You have at least 30GB of free space - the database takes a lot of space.

## Install the extension
1. Open Google Chrome and navigate to [chrome://extensions](chrome://extensions).
2. Turn on **"Developer mode"** (top right corner).
3. Click **"Load unpacked"**, navigate to the folder **that contains** the folder `extension`. Click the folder extension **once** to highlight it (don't double click it - that will navigate into it), and click "Open".

## Set up the Server
Currently the server is only available to be run locally on your machine. Due to the large volume of the database files, 
In order to set up the server, you need to:
1. Download the database files from the following Google Drive link: [TO DO: PUT URL]
2. Place the downloaded `privaseer_full.tar.gz` tarball file in the currently empty  `privaseer_full` directory inside the code directory. Unzip the tarball in the directory.
	* The `privaseer_full` directory should now contain two sub-directories - `privaseer_full` and `metadata`
3. Open a command console and navigate to the code directory. Run the command  `pip3 install -r requirements.txt` to install the different modules and packages used by our server.

## Sign up to OpenAI to get an API Key
1. Go to [https://platform.openai.com/signup?launch](https://platform.openai.com/signup?launch) and sign up for an account, or log-in into an account if you possess one already.
2. Once logged in, navigate to [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys) to generate your API key by pressing the **Create new secret key** button. 
3. Copy the entire API key that is given to you and paste it in `credentials.py` in the code directory, between the quotation marks in the third line.
	* The line of code should be of the format `api_key = "***SECRET CODE HERE***"`