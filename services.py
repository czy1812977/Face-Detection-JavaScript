import os
from flask import *

app = Flask(__name__)


@app.route('/index', methods=['GET', 'POST'])
def pic_recong_synch():
    return render_template('index.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=8080)
