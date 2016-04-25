var app = angular.module("app", ['ngRoute', 'angular-jwt', 'angular-storage']);

app.constant('CONFIG', {
    APIURL: "http://localhost:8504"
})

.config(["$routeProvider", "$httpProvider", "jwtInterceptorProvider",  function ($routeProvider, $httpProvider, jwtInterceptorProvider) {
    $httpProvider.defaults.headers.common["X-Requested-With"] = 'XMLHttpRequest';

    jwtInterceptorProvider.tokenGetter = ['store', 'jwtHelper', '$http', '$location', 'CONFIG', function (store, jwtHelper, $http, $location, CONFIG) {
        var token = store.get('token');

        if (token) {
            if (jwtHelper.isTokenExpired(token)) {
                return $http({
                    url: CONFIG.APIURL + '/auth/renewtoken',
                    skipAuthorization: true,
                    method: 'POST',
                    data: {
                        grant_type: 'refresh_token',
                        refresh_token: token
                    }
                }).then (function (response) {
                    token = response.data.token;

                    if (!token) {
                        store.remove('token');
                        $location.path("/login");
                    } else {
                        store.set('token', token);
                        return token;
                    }
                }, function (error) {
                    store.remove('token');
                    $location.path("/login");
                });
            }else{
                return token;
            }
        }
    }];

    $httpProvider.interceptors.push('jwtInterceptor');

    $routeProvider.when('/', {
        redirectTo: "/home"
    })
    .when("/home", {
        templateUrl: 'templates/home.html',
        controller: 'homeCtrl',
        authorization: true
    })
    .when("/login", {
        templateUrl: 'templates/login.html',
        controller: 'loginCtrl',
        authorization: false
    });

}])

.controller('homeCtrl', ['$scope', 'jwtHelper', 'contactsFactory', 'store', '$location', function($scope, jwtHelper, contactsFactory, store, $location)
{
    var token = store.get("token");

    if(token) {
	    //decodificamos para obtener los datos del user
    	var tokenPayload = jwtHelper.decodeToken(token);

    	//los mandamos a la vista como user
        $scope.user = tokenPayload;

        $scope.getContacts = function()
        {
            contactsFactory.get().then(function(res)
            {
                if(res.data && res.data.code == 0)
                {
                    store.set('token', res.data.token);

                    $scope.contacts = res.data.contactos;
                }
            });
        };

        $scope.logOut = function()
        {
            if(confirm('Esta seguro de salir?')){
                store.remove('token');
                $location.path("/login");
            };
        };
    }
}])

.controller('loginCtrl', ['$scope', 'authFactory', 'store', '$location', function($scope, authFactory, store, $location)
{
    $scope.login = function(user)
    {
        authFactory.login(user).then(function(res)
        {

            if(res.data && res.data.code == 0)
            {
                store.set('token', res.data.token);

                $location.path("/home");
            }
        });
    };
}])

.factory("authFactory", ["$http", "$q", "CONFIG", function($http, $q, CONFIG)
{
	return {
		login: function(user)
		{
		    var deferred;
		    deferred = $q.defer();

		    $http({
                method: 'POST',
                skipAuthorization: true,
                url: CONFIG.APIURL + '/auth/login',
                data: $.param(user),
                headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
		    })
		    .then(function(res)
		    {
                deferred.resolve(res);
		    })
		    .then(function(error)
		    {
                deferred.reject(error);
		    });

		    return deferred.promise;
		}
	};
}])

.factory("contactsFactory", ["$http", "$q", "CONFIG", function($http, $q, CONFIG)
{
    return{
        get: function()
        {
            var deferred;
            deferred = $q.defer();

            $http({
                method: 'GET',
                skipAuthorization: false,
                url: CONFIG.APIURL + '/contacts'
	    })
            .then(function(res)
            {
                deferred.resolve(res);
            })
            .then(function(error)
            {
                deferred.reject(error);
            });

            return deferred.promise;

        }
    };
}])

.run(["$rootScope", 'jwtHelper', 'store', '$location', function($rootScope, jwtHelper, store, $location)
{
    $rootScope.$on('$routeChangeStart', function (event, next)
    {
        var token = store.get("token") || null;

        if(!token)
	{
		$location.path("/login");
	}
   });
}]);

