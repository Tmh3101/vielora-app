=== Vielora Chatbot ===
Contributors: vielorateam
Tags: chatbot, ai, customer support, live chat, widget
Requires at least: 5.0
Tested up to: 6.9
Stable tag: 1.0.0
Requires PHP: 7.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Embed the Vielora AI chatbot widget on your WordPress website by entering your Vielora Bot ID.

== Description ==

Vielora Chatbot connects your WordPress website to the Vielora AI chatbot service. After you add your Bot ID, the plugin loads the Vielora widget script on the public site so visitors can chat with your configured assistant.

The plugin does not include chatbot model code locally. Chatbot responses, conversation handling, and related service functionality are provided by Vielora at https://vielora.vn.

Features:

* Simple setup with a single Bot ID.
* Asynchronous widget loading.
* No theme editing or custom code required.
* Uses WordPress settings APIs for saving configuration.

== External services ==

This plugin connects to the Vielora service to load and operate the chatbot widget.

When a Bot ID is configured, the public site loads the widget script from:

* https://vielora.vn/widget.js

The plugin passes the configured Bot ID to that script as a data attribute so the Vielora service can load the correct chatbot. Visitor chat messages and widget interactions are handled by the Vielora service according to Vielora's terms and privacy policy.

Service website: https://vielora.vn

Privacy policy: https://vielora.vn/privacy

Terms of service: https://vielora.vn/terms

== Installation ==

1. Upload the `vielora-chatbot` folder to the `/wp-content/plugins/` directory, or install the plugin from the WordPress plugin directory.
2. Activate "Vielora Chatbot" from the Plugins screen in WordPress.
3. Open the "Vielora Chatbot" menu in the WordPress admin.
4. Enter the Bot ID from your Vielora dashboard and save the settings.

== Frequently Asked Questions ==

= How do I find my Bot ID? =

Sign in to the Vielora dashboard, open the chatbot you want to embed, and copy the Bot ID from the integration settings.

= Does this plugin slow down my website? =

The widget script is loaded asynchronously in the footer after a Bot ID is configured.

= Does the plugin send data to an external service? =

Yes. The plugin loads the Vielora widget script from https://vielora.vn and passes your configured Bot ID so the correct chatbot can be displayed. Visitor chat interactions are handled by the Vielora service.

== Changelog ==

= 1.0.0 =
* Initial release.
* Add Bot ID configuration page.
* Load Vielora chatbot widget asynchronously on the public site.
