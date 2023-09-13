from PolicyHighlighter import create_app

app = create_app()

if __name__ == '__main__':
    #app.run(host="localhost", port=5000, debug=True)
    #app.run(host="localhost", port=5000, debug=True, use_reloader=False)
    app.run(host="localhost", port=5000, debug=False, use_debugger=False, use_reloader=False, threaded=False)
