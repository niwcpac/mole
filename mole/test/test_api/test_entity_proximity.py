import datetime

from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.test import tag

from data_collection.factories import factories


class ProximalEntitiesTests(APITestCase):
    def setUp(self):
        factories.UserFactory(username="test_user", password="test_pass")
        test_entity_type = factories.EntityTypeFactory(
            name="test_entity_type",
        )
        type_2 = factories.EntityTypeFactory()
        entity_1 = factories.EntityFactory(
            entity_type=test_entity_type,
            name="entity_1",
        )
        entity_2 = factories.EntityFactory(
            entity_type=type_2,
            name="entity_2",
        )
        entity_3 = factories.EntityFactory(
            entity_type=test_entity_type,
            name="entity_3",
        )
        factories.PoseFactory(entity=entity_1, point="POINT(32.7341 -117.1933)")
        factories.PoseFactory(entity=entity_2, point="POINT(32.7340 -117.1930)")
        factories.PoseFactory(entity=entity_3, point="POINT(32.7341 -117.1934)")

        factories.EntityGroupFactory(name="test_group")

        self.client.login(username="test_user", password="test_pass")

    @tag("fast")
    def test_around_endpoint(self):
        """
        Ensure that proximal entities will appear in the response \
            in order of increasing distance.
        The result should not contain the target entity itself.
        """
        url = f"{reverse('entity-around', args=['entity_1'])}?distance=notafloat"
        response = self.client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        url = f"{reverse('entity-around', args=['entity_1'])}?distance=15"
        response = self.client.get(url)
        assert len(response.data) == 1, f"{url} should return 1 entity"

        url = f"{reverse('entity-around', args=['entity_1'])}?distance=50"
        response = self.client.get(url)
        assert len(response.data) == 2, f"{url} should return 2 entities"
        assert (
            response.data[0][0] == "entity_3"
        ), "First entity should be the closer entity"
        assert (
            response.data[1][0] == "entity_2"
        ), "Second entity should be the further entity"

        url = f"{reverse('entity-around', args=['entity_1'])}?distance=50&entity_type=test_entity_type"
        response = self.client.get(url)
        assert len(response.data) == 1, f"{url} filtered should return 1 entities"
        assert (
            response.data[0][0] == "entity_3"
        ), "Entity should match entity_type filter"

    @tag("fast")
    def test_radius_endpoint(self):
        """
        Ensure that proximal entities to a location will appear in the \
            response in order of increasing distance.
        """
        url = reverse("entity-radius")
        response = self.client.get(url)
        assert (
            response.status_code == status.HTTP_400_BAD_REQUEST
        ), "No latitude or longitude specified, should be an invalid request"
        url = f"{reverse('entity-radius')}?longitude=0"
        response = self.client.get(url)
        assert (
            response.status_code == status.HTTP_400_BAD_REQUEST
        ), "No latitude specified, should be an invalid request"

        url = f"{reverse('entity-radius')}?longitude=0&latitude=0"
        response = self.client.get(url)
        assert len(response.data) == 0, f"{url} should return 0 entities"

        url = f"{reverse('entity-radius')}?distance=15&longitude=32.7341&latitude=-117.1933"
        response = self.client.get(url)
        assert len(response.data) == 2, f"{url} should return 2 entities"
        assert (
            response.data[0][0] == "entity_1"
        ), "First entity should be the closer entity"
        assert (
            response.data[1][0] == "entity_3"
        ), "Second entity should be the further entity"

        url = f"{reverse('entity-radius')}?distance=50&longitude=32.7341&latitude=-117.1933"
        response = self.client.get(url)
        assert len(response.data) == 3, f"{url} should return 3 entities"
        assert (
            response.data[0][0] == "entity_1"
        ), "First entity should be the closer entity"
        assert response.data[1][0] == "entity_3"
        assert response.data[2][0] == "entity_2"

        url = f"{reverse('entity-radius')}?distance=50&longitude=32.7341&latitude=-117.1933&group=test_group"
        response = self.client.get(url)
        assert (
            len(response.data) == 0
        ), f"{url} filtered by group should return 0 entities"
