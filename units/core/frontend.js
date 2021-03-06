/**
 * App client entry-point and initialiser
 */
angular
	.module('app', [
		'angular-bs-confirm',
		'angular-bs-popover',
		'angular-bs-tooltip',
		'angular-mfdc-router',
		'angular-ui-loader',
		'ngAnimate',
		'ngResource',
		'ngSanitize',
		'ngTreeTools',
		'ui.gravatar',
		'ui.select',
		'ui-notification',
		'uiToggle',
	])

	// Global controller {{{
	.controller('GlobalCtrl', function($config, $rootScope, $router, $scope, $session) {
		var $global = this;
		// Init user session object/data
		$global.$config = $config;
		$global.$router = $router;
		$global.$session = $session;
	})
	// }}}

	// Anglar core config {{{
	// Enable async HTTP for performance boost {{{
	.config(function($httpProvider) {
		$httpProvider.useApplyAsync(true);
	})
	// }}}

	// Configure $location to not stupidly encode URLS {{{
	.config(function($locationProvider) {
		$locationProvider.hashPrefix(''); // URL Mode: http://domain/#/path
	})
	// }}}

	// Add additional methods to $location - $location.redirect {{{
	.config($provide => $provide.decorator('$location', $delegate => {
		/**
		* Add $location.redirect
		* This is a very simple wrapper around window.location but keeps things consistant by providing it within the $location handler
		* @param {string} url A full or partial URL to redirect to
		*/
		$delegate.redirect = url => window.location = url;
		return $delegate;
	}))
	// }}}

	// Add additional methods to $resource {{{
	.config(function($resourceProvider) {
		angular.extend($resourceProvider.defaults.actions, {
			count: {
				method: 'GET',
				params: {
					id: 'count',
				},
			},
			create: {
				method: 'POST',
			},
			meta: {
				method: 'GET',
				params: {
					id: 'meta',
					collectionEnums: true,
					prototype: true,
				},
			},
		});
	})
	// }}}

	// Force $http headers via GET to not be cached {{{
	.config(($httpProvider, $provide) => {
		if (!$httpProvider.defaults.headers.get) $httpProvider.defaults.headers.get = {}; // Initialize get headers if not there

		// Override all Cache-Control
		$httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache, no-store, must-revalidate';
		$httpProvider.defaults.headers.get['Pragma'] = 'no-cache';

		// Horrible hack to force IE11 to always reload GET requests {{{
		// This hack works by gluing `t=${Date.now()}` to all outgoing queries (but only for IE11)
		if (!(window.ActiveXObject) && "ActiveXObject" in window) { // Is IE11?
			$provide.provider('overrideIESerializer', function() {
				this.$get = function($httpParamSerializer) {
					return params => $httpParamSerializer(_.assign({t: Date.now()}, params || {}));
				};
			});

			$httpProvider.defaults.paramSerializer = 'overrideIESerializer';
		}
		// }}}
	})
	// }}}

	// Force $http query encoding to use the jQuery like encoder (necessary to work with complex objects with a Monoxide backend) {{{
	.config($httpProvider => $httpProvider.defaults.paramSerializer = '$httpParamSerializerJQLike')
	// }}}

	// Filekit config {{{
	.run(function($filekit, $loader, $prompt, $rootScope, $toast) {
		// Setup FileKit to use the $toast error catcher
		$filekit.settings.errorHandler = (err, files) => $toast.catch(err);

		// Setup FileKit to use $prompt.text() as a text prompt
		$filekit.settings.prompter = options => $prompt.text({
			title: options.title,
			body: options.body,
			default: options.default,
		});

		// Make $loader trigger when uploads start / end
		$rootScope.$on('filekitTaskBegin', (e, id) => $loader.startBackground(id));
		$rootScope.$on('filekitTaskEnd', (e, id) => $loader.stop(id));

		// Make $toast.progress handle file progression
		$rootScope.$on('filekitProgress', (e, data) => $toast.progress(`filekit-upload-${data.file.name}`, `Uploading ${data.file.name}...`, data.progress));
		$filekit.settings.uploadStatus.enabled = false; // Disable the filekit method of showing status as the $toast.progress() function now handles it
	})
	// }}}

	// Disable the annoying 'possibly unhandled error' prompt {{{
	.config($qProvider => $qProvider.errorOnUnhandledRejections(false))
	// }}}
	// }}}

	// Router config {{{

	// Disable developer warnings if we're in production {{{
	.run(function($config, $rootScope, $router) {
		if ($config.isProduction) {
			$router.warnings(false);
		} else { // We're not in production - attach to the debug handler just in cast thats enabled
			$rootScope.$on('routerDebug', (e, ...args) => console.log('ROUTER DEBUG:', ...args));
		}
	})
	// }}}

	// Validate ':id' against a 24 bit hex string if seen in a URL {{{
	.run(function($router) {
		$router.tokenRule(':id', id => /^[0-9a-f]{24}$/.test(id));
	})
	// }}}

	// Ensure all pages have a trailing slash when using a hashpath (e.g. `http://something#/something` -> `http://something/#/something {{{
	.run(function($window) {
		if ($window.location.pathname != '/' && $window.location.hash && !$window.location.pathname.endsWith('/')) {
			console.log('Redirect due to page not ending in slash');
			$window.location.pathname += '/';
		}
	})
	// }}}

	// Add helper classes to the body element when were routing {{{
	.run(function($rootScope, $timeout) {
		// add .router-routing class to body when routing and remove it 1s after we have finished loading (i.e. everything has settled)
		$rootScope.$on('$routerStart', ()=> angular.element('body').addClass('router-routing'))
		$rootScope.$on('$routerSuccess', ()=> $timeout(()=> angular.element('body').removeClass('router-routing'), 1000));
		$rootScope.$on('$routerError', ()=> $timeout(()=> angular.element('body').removeClass('router-routing'), 1000));
	})
	// }}}

	// Animate the page loader while navigating {{{
	.run(function($loader, $rootScope) {
		$rootScope.$on('$routerStart', ()=> $loader.clear().start('routerNav'));
		$rootScope.$on('$routerSuccess', ()=> $loader.stop('routerNav'));
		$rootScope.$on('$routerError', ()=> $loader.stop('routerNav'));
	})
	// }}}

	// Cleanup Bootstrap elements on navigation {{{
	.run(function($rootScope) {
		$rootScope.$on('$routerStart', ()=> {
			// Destory any open Bootstrap modals
			$('body > .modal-backdrop').remove();

			// Destroy any open Bootstrap tooltips
			$('body > .tooltip').remove();

			// Destroy any open Bootstrap popovers
			$('body > .popover').remove();
		});
	})
	// }}}

	// Focus any input element post-navigation {{{
	.run(function($rootScope) {
		$rootScope.$on('$routerSuccess', ()=>
			$('div[ui-view=main]').find('input[autofocus]')
				.each(function() {
					this.selectionEnd = this.selectionStart = this.value.length;
				})
				.focus()
		);
	})
	// }}}

	// Reattach 'waves' effect on every router reload {{{
	.run(function($rootScope) {
		$rootScope.$on('$routerSuccess', ()=> {
			// NOTE: All the below attachment rules assumes `waves-effect` is applied anyway
			$('.btn').addClass('waves-effect');
			$('.btn-circle').addClass('waves-circle');
			$('.input-group > .btn').addClass('waves-table-cell');
			$('a.list-group-items, .dropdown-menu > li > a, .main-menu > li > a').addClass('waves-effect waves-block');

			// Re-init
			Waves.init();
		});
	})
	// }}}

	// Set layout.isImportant = false on every router start
	// Work around to prevent no header, no sidebar after reloading database
	//{{{
	.run(function($rootScope, $config) {
		$rootScope.$on('$routerStart', ()=> {
			$config.layout.isImportant = false;
		});
	})
	// }}}

	// Reload default layout settings on every router success {{{
	.run(function($rootScope, $config) {
		$rootScope.$on('$routerSuccess', ()=> {
			if (!$config.layout.isImportant) {
				$config.layout.headerNavbar = true;
				$config.layout.sidebar = true;
				$config.layout.footer = false;
			}
		});
	})
	// }}}

	// Adjust page title when the page changes {{{
	.run(function($config, $rootScope) {
		$rootScope.$on('$routerSuccess', (e, rule) => document.title = $config.title + (_.has(rule, '_data.title') ? ' | ' + rule._data.title : ''));
	})
	// }}}

	// Page load animation {{{
	.run(function($rootScope, $timeout) {
		var previousRule;

		$rootScope.$on('$routerStart', (e, rule) => {
			previousRule = rule;
			angular.element('#content').css('opacity', 0);
		});

		$rootScope.$on('$routerSuccess', (e, rule) => {
			if (previousRule && previousRule._id && rule._id == previousRule._id) { // Navigating to self - skip animation
				angular.element('#content').css('opacity', 1);
				return;
			}

			var pageArea = angular.element('#content')
			pageArea
				.animate({
					opacity: 1,
				}, {
					duration: 400,
					easing: 'swing',
					complete: ()=> pageArea.css({opacity: ''}), // Remove mutated properties when we're done with them
				});
		});
	})
	// }}}

	// Scroll to top of page when navigating {{{
	.run(function($loader, $rootScope) {
		$rootScope.$on('$routerSuccess', ()=> $('#content').scrollTop(0));
	})
	// }}}

	// Append $router.breadcrumbs() + $router.title to router {{{
	.run(function($config, $rootScope, $router) {
		$router.page = {_title: $config.title, _breadcrumbs: []};

		/**
		* Set the page title
		* This overrides any initial call to the routes title (via `$router.when(...).title('Something')`)
		* NOTE: Falsy arguments are ignored
		* @param {string,array} ...title The title or title segments to set. The main site title is automatically pre-pended
		* @return {$router.page} Chainable $router.page object
		*/
		$router.page.title = function(...title) {
			$router.page._title = document.title = [$config.title]
				.concat(_.flatten(title))
				.filter(i => !!i)
				.reverse()
				.join(' | ');

			return $router.page;
		};


		/**
		* Set the page breadcrumbs
		* NOTE: Falsy arguments are ignored
		* @param {array} ...breadcrumbs The breadcrumb segments to set. Each item should be an object of the form {link,title}
		* @return {$router.page} Chainable $router.page object
		*/
		$router.page.breadcrumbs = function(...breadcrumbs) {
			$router.page._breadcrumbs = _.flatten(breadcrumbs).filter(i => !!i);
			return $router.page;
		};


		$rootScope.$on('$routerStart', ()=> { // Reset tite + breadcrumbs on each page navigate
			$router.page._title = $config.title;
			$router.page._breadcrumbs = [];
		});
	})
	// }}}

	// }}}

	// Theme {{{

	// Disable animation effects on certain elements by default {{{
	.config($animateProvider => {
		$animateProvider.classNameFilter(/^((?!(fa-spinner|btn|brand-icon|modal)).)*$/);
	})
	// }}}

	// Configure Selectize {{{
	.config(function(uiSelectConfig) {
		uiSelectConfig.theme = 'selectize';
	})
	// }}}

	// Select any [autofocus] within a model after its finished animating {{{
	.run(()=> $(document).on('shown.bs.modal', ()=> $('.modal.in .modal-body [autofocus]').focus()))
	// }}}

	// Modals matching `.modal.in .modal-body table > tbody > tr` should move focus with up/down keys {{{
	// Any model with a table in its `modal-body` will move focus when the up/down arrow keys are pressed - this makes navigating lists in modals a little easier
	.run(()=> {
		$(document, '.modal').keydown(e => {
			if (
				!$('body').hasClass('modal-open') || // No model open
				(e.which != 38 && e.which != 40) || // Not up / down
				!$('.modal.in .modal-body > table').length // No table to select things from
			) return;
			e.preventDefault();

			var scrollTable = $('.modal.in .modal-body > table');

			var focusRow = scrollTable.find('tr:focus');

			if (!focusRow.length) { // No focus - select first item
				scrollTable.find('tbody').find('tr').first().focus();
			} else if (e.which == 38) { // Existing focus - Move up
				focusRow.prev().focus();
			} else if (e.which == 40) { // Existing focus - Move down
				focusRow.next().focus();
			}
		});
	})
	// }}}

	// Remove bootstraping body class now everything is ready {{{
	.run($timeout => $timeout(()=> $('body').removeClass('bootstraping')))
	// }}}

	// }}}
