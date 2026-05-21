<?php
/**
 * Plugin Name:       Vielora Chatbot
 * Plugin URI:        https://vielora.vn
 * Description:       Tich hop tro ly AI Vielora vao website WordPress cua ban chi voi vai buoc cau hinh.
 * Version:           1.0.0
 * Requires at least: 5.0
 * Requires PHP:      7.0
 * Author:            Vielora Team
 * Author URI:        https://vielora.vn
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       vielora-chatbot
 * Domain Path:       /languages
 *
 * @package Vielora_Chatbot
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Main plugin class.
 */
class Vielora_Chatbot_Plugin {
	const VERSION    = '1.0.0';
	const SCRIPT_URL = 'https://vielora.vn/widget.js';
	const BASE_URL   = 'https://vielora.vn';
	const HANDLE     = 'vielora-chatbot-widget';

	/**
	 * Register WordPress hooks.
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'add_settings_page' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'inject_widget_script' ) );
		add_filter( 'script_loader_tag', array( $this, 'add_script_attributes' ), 10, 3 );
	}

	/**
	 * Add plugin settings page.
	 *
	 * @return void
	 */
	public function add_settings_page() {
		add_menu_page(
			__( 'Vielora Chatbot Settings', 'vielora-chatbot' ),
			__( 'Vielora Chatbot', 'vielora-chatbot' ),
			'manage_options',
			'vielora-chatbot',
			array( $this, 'render_settings_page' ),
			'dashicons-format-chat',
			100
		);
	}

	/**
	 * Register plugin options.
	 *
	 * @return void
	 */
	public function register_settings() {
		register_setting(
			'vielora_chatbot_settings',
			'vielora_chatbot_bot_id',
			array(
				'type'              => 'string',
				'sanitize_callback' => array( $this, 'sanitize_bot_id' ),
				'default'           => '',
			)
		);
	}

	/**
	 * Sanitize the configured Bot ID.
	 *
	 * @param string $value Raw option value.
	 * @return string
	 */
	public function sanitize_bot_id( $value ) {
		$value = sanitize_text_field( wp_unslash( $value ) );

		return preg_replace( '/[^A-Za-z0-9_-]/', '', $value );
	}

	/**
	 * Render the settings page.
	 *
	 * @return void
	 */
	public function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$bot_id           = get_option( 'vielora_chatbot_bot_id', '' );
		$settings_updated = filter_input( INPUT_GET, 'settings-updated', FILTER_SANITIZE_FULL_SPECIAL_CHARS );
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Integrate Vielora Chatbot', 'vielora-chatbot' ); ?></h1>

			<?php if ( $settings_updated ) : ?>
				<div class="notice notice-success is-dismissible">
					<p><?php esc_html_e( 'Bot ID saved successfully. Vielora Chatbot is now active on your website.', 'vielora-chatbot' ); ?></p>
				</div>
			<?php endif; ?>

			<div style="background: #fff; padding: 20px; margin-top: 20px; border: 1px solid #ccd0d4; border-radius: 4px; max-width: 700px; box-shadow: 0 1px 1px rgba(0,0,0,.04);">
				<div style="margin-bottom: 20px;">
					<h2><?php esc_html_e( 'How to get your Bot ID', 'vielora-chatbot' ); ?></h2>
					<ol>
						<li>
							<?php esc_html_e( 'Sign in to', 'vielora-chatbot' ); ?>
							<a href="<?php echo esc_url( self::BASE_URL . '/dashboard' ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Vielora Dashboard', 'vielora-chatbot' ); ?></a>.
						</li>
						<li><?php esc_html_e( 'Choose the chatbot you want to embed.', 'vielora-chatbot' ); ?></li>
						<li>
							<?php esc_html_e( 'Copy the Bot ID from the integration settings or from a dashboard URL such as', 'vielora-chatbot' ); ?>
							<code><?php echo esc_html( self::BASE_URL . '/dashboard/bots/ABC-123' ); ?></code>.
							<?php esc_html_e( 'In that example,', 'vielora-chatbot' ); ?>
							<strong><?php esc_html_e( 'ABC-123', 'vielora-chatbot' ); ?></strong>
							<?php esc_html_e( 'is the Bot ID.', 'vielora-chatbot' ); ?>
						</li>
					</ol>
				</div>

				<hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />

				<form method="post" action="options.php">
					<?php settings_fields( 'vielora_chatbot_settings' ); ?>

					<table class="form-table" role="presentation">
						<tr>
							<th scope="row" style="width: 150px;">
								<label for="vielora_chatbot_bot_id"><strong><?php esc_html_e( 'Your Bot ID', 'vielora-chatbot' ); ?></strong></label>
							</th>
							<td>
								<input
									type="text"
									id="vielora_chatbot_bot_id"
									name="vielora_chatbot_bot_id"
									value="<?php echo esc_attr( $bot_id ); ?>"
									class="regular-text"
									placeholder="<?php esc_attr_e( 'Example: e3a1b2c3', 'vielora-chatbot' ); ?>"
									required
								/>

								<?php if ( ! empty( $bot_id ) ) : ?>
									<p class="description" style="color: #00a32a; font-weight: 500; margin-top: 8px;">
										<span class="dashicons dashicons-yes" aria-hidden="true"></span>
										<?php esc_html_e( 'The plugin is active and the chatbot widget will be loaded on the public site.', 'vielora-chatbot' ); ?>
									</p>
								<?php else : ?>
									<p class="description" style="margin-top: 8px;">
										<?php esc_html_e( 'The chatbot will not load until you enter a Bot ID.', 'vielora-chatbot' ); ?>
									</p>
								<?php endif; ?>
							</td>
						</tr>
					</table>

					<p class="description">
						<?php esc_html_e( 'This plugin loads the Vielora widget from', 'vielora-chatbot' ); ?>
						<code><?php echo esc_html( self::SCRIPT_URL ); ?></code>
						<?php esc_html_e( 'after you save a Bot ID.', 'vielora-chatbot' ); ?>
					</p>

					<?php submit_button( __( 'Activate Chatbot', 'vielora-chatbot' ) ); ?>
				</form>
			</div>
		</div>
		<?php
	}

	/**
	 * Enqueue the external Vielora widget script when configured.
	 *
	 * @return void
	 */
	public function inject_widget_script() {
		$bot_id = get_option( 'vielora_chatbot_bot_id', '' );

		if ( empty( $bot_id ) ) {
			return;
		}

		wp_enqueue_script( self::HANDLE, self::SCRIPT_URL, array(), self::VERSION, true );
	}

	/**
	 * Add async and Vielora data attributes to the widget script tag.
	 *
	 * @param string $tag    Script tag.
	 * @param string $handle Script handle.
	 * @param string $src    Script source URL.
	 * @return string
	 */
	public function add_script_attributes( $tag, $handle, $src ) {
		if ( self::HANDLE !== $handle ) {
			return $tag;
		}

		$bot_id = get_option( 'vielora_chatbot_bot_id', '' );

		if ( empty( $bot_id ) ) {
			return $tag;
		}

		return sprintf(
			'<script src="%1$s" id="%2$s-js" data-bot-id="%3$s" data-base-url="%4$s" async></script>' . "\n",
			esc_url( $src ),
			esc_attr( self::HANDLE ),
			esc_attr( $bot_id ),
			esc_url( self::BASE_URL )
		);
	}
}

new Vielora_Chatbot_Plugin();
