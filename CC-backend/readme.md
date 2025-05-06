#Testing
To run our unit test suite, first install all the requirements from tests/requirements.txt, and then follow following commands! Enjoy testing:
```
pytest --cov=main --cov=models --cov=database --cov=utils --cov=routers --cov-report=html
coverage report
```