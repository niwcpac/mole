from rest_framework.test import APITestCase
from rest_framework import status

from django.urls import reverse

from data_collection.factories import factories


class UserLoginTests(APITestCase):
    def setUp(self):
        self.test_user = factories.UserFactory(
            username="test_user", password="test_pass"
        )
        self.client.login(username="test_user", password="test_pass")

    def test_login_user(self):
        """
        Ensure we can create a new user object.
        """
        url = reverse("user-list")
        data = {"username": "unit-test-user", "password": "unit-test-password"}
        response = self.client.post(url, data, format="json")

        url = "/accounts/login/"
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
