from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner of the snippet
        return obj.owner == request.user


class IsTargetUserOrReadOnly(permissions.IsAuthenticated):
    #    def has_permission(self, request, view):
    #        # allow user to list all users if logged in user is staff
    #        return view.action == 'retrieve' or request.method in permissions.SAFE_METHODS

    def has_object_permission(self, request, view, obj):
        # allow logged in user to view own details, allows all to view all records
        #        return request.method in permissions.SAFE_METHODS or obj == request.user
        return request.method in permissions.SAFE_METHODS or obj == request.user
