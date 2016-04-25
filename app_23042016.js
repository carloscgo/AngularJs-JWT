var app = angular.module("app", ['ngRoute', 'angular-jwt', 'angular-storage']);

app.constant('CONFIG', {
    APIURL: "http://localhost:8504"
})

.config(["$routeProvider", "$httpProvider", "jwtInterceptorProvider",  function ($routeProvider, $httpProvider, jwtInterceptorProvider)
{
    $httpProvider.defaults.headers.common["X-Requested-With"] = 'XMLHttpRequest';

//    jwtInterceptorProvider.tokenGetter = ['contactsFactory', 'expiredToken', '$location', 'store', function(contactsFactory, expiredToken, $location, store) {
//        var token = store.get("token");

    jwtInterceptorProvider.tokenGetter = ['jwtHelper', '$http', 'store', function(jwtHelper, $http, store) {
        var jwt = store.get('token');

        if(jwt){
            if(jwtHelper.isTokenExpired(jwt)){
                return $http({
                    url : '/auth/renewtoken',
                    skipAuthorization : true,
                    method: 'GET',
                    headers : { Authorization : 'Bearer '+ jwt},
                }).then(function(response){
                    store.set('jwt', response.data.token);
                    return response.data.token;
                },function(response){
                    store.remove('jwt');
                });
            }else{
                return jwt;
            }
        }
    }];

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
    })

}])

.controller('homeCtrl', ['$scope', 'jwtHelper', 'contactsFactory', 'store', '$location', 'expiredToken', function($scope, jwtHelper, contactsFactory, store, $location, expiredToken)
{
    var tk = store.get("token");

    if(tk)
    {
	expiredToken.check(tk).then(function(token){
		if(token != ''){
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
			}
		}else{
	                $location.path("/login");
		}
	});
    };
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
	})
    }
}])

.factory("expiredToken", ["$location", "$http", "$q", "jwtHelper", "CONFIG", "store", function($location, $http, $q, jwtHelper, CONFIG, store)
{
	return {
		check: function(token)
		{
	            var deferred;
	            deferred = $q.defer();

		    if(jwtHelper.isTokenExpired(token) === true){
			return $http({
			    url : CONFIG.APIURL + '/auth/renewtoken',
			    skipAuthorization : true,
			    method: 'GET',
			    headers : { Authorization : 'Bearer '+ token},
			})
			.then(function(response){
console.log(response.data);
			    	if(response.data && response.data.code == 0){
				    store.set('token', response.data.token);

//					    return response.data.token;

				    deferred.resolve(response.data.token);
				}else{
				    store.remove('token');

//				    $location.path("/");

				    deferred.reject(response);
				};
			})
			.then(function(response){
			    store.remove('token');

//			    $location.path("/");

			    deferred.reject(response);
			});
		    }else{
//			return token;
	  	        deferred.resolve(token);
		    }

	 	    return deferred.promise;
		}
	}
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
		    })

		    return deferred.promise;
		}
	}
}])

.factory("contactsFactory", ["$http", "$q", "store", "CONFIG", function($http, $q, store, CONFIG)
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
            })

            return deferred.promise;

        }
    }
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
        else
	{
		var bool = jwtHelper.isTokenExpired(token);

	        if(bool === true)
	            $location.path("/login");
	}
   });
}]);

