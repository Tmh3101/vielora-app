# PRIVACY POLICY

Last updated: **March 12, 2026**

This Privacy Policy describes how **Titops DX4U Company** (the entity owning, developing, and operating the Vielora platform, hereinafter referred to collectively as "Titops DX4U", "we", or "us") collects, uses, stores, and shares your personal information when you use the Vielora AI chatbot platform, including the administrative Dashboard and embedded Chat Widgets on websites.

This Policy is formulated in compliance with **Decree No. 13/2023/ND-CP** on Personal Data Protection of the Government of the Socialist Republic of Vietnam.

_(Legal Notice: All liabilities, commitments, and data processing provisions associated with the "Vielora" platform in this document are directly executed and assumed by the managing legal entity, Titops DX4U Company)._

## 1. Roles of Titops DX4U in Data Processing

Under the service model of the Vielora platform, our legal responsibilities are clearly demarcated as follows:

- **For Account Owners (Registered Vielora Customers):** We act as the **"Data Controller and Processor"**. We determine the collection of your account and payment information to provide the service.
- **For End Users (Visitors interacting via the Chat Widget):** Vielora's customers (website owners) act as the "Data Controller". Titops DX4U acts solely as the **"Data Processor"**. We process conversation data only on behalf of and in accordance with the configurations of the website owner. Website owners are responsible for notifying and obtaining consent from their end users.

## 2. Types of Data We Collect

### 2.1. Data from Account Owners (B2B Customers)

- **Identification Information:** Full name, email address authenticated through the Supabase Auth system.
- **Payment Data:** Transaction history, subscription tiers. The actual payment process is encrypted and processed directly by our domestic partner payOS. We do not store your raw credit card numbers or original bank account details.
- **Knowledge Base Data for Bot:** Website URLs, scraped HTML content, or text documents you voluntarily provide as knowledge base materials for the chatbot.

### 2.2. Data from End Users (via Chat Widget)

- **Device Identifiers:** We utilize FingerprintJS to generate unique identifiers for rate limiting management and conversation history continuity.
- **Conversation Data:** Content of messages sent through the Widget and AI-generated responses.
- **Technical Data:** Access IP address, referring website domain where the widget is embedded for security, DDoS mitigation, and CORS authentication.
- **Data from the Vielora Chatbot WordPress Plugin:** When a website owner enters a Bot ID and activates the plugin, the website loads the widget script from `https://vielora.vn/widget.js`. The plugin transmits the configured Bot ID so Vielora can identify and display the correct chatbot. When visitors interact with the widget, message content, technical metadata, and session identifiers may be transmitted to Vielora systems to process chatbot responses.

## 3. Purposes of Data Processing

We process your personal data to:

1. Provide, maintain, and optimize the performance of our semantic search and RAG models.
2. Manage credit billing based on the number of indexed pages and processed chat messages.
3. Prevent abuse, fraud, and distributed denial-of-service (DDoS) attacks.
4. Provide statistical reporting and analytics to website owners within the Dashboard.

## 4. Artificial Intelligence (AI) Privacy & Security Commitments

We understand concerns regarding data usage in AI training. Titops DX4U explicitly commits:

- Your knowledge base data and conversation logs are **strictly used to provide context** for real-time question answering.
- We **ABSOLUTELY DO NOT** use your proprietary business data to train our foundational large language models or those of Google.

## 5. Third-Party Data Sharing

To deliver seamless services, we utilize infrastructure from trusted technology partners who are bound by strict confidentiality and data protection agreements:

- **Google (Google Gemini):** Scraped text data and chat messages are transmitted via Google APIs to generate Vector Embeddings (gemini-embedding-001) and synthesize responses (gemini-2.5-flash-lite).
- **Supabase:** Database infrastructure (PostgreSQL) and object storage (Storage) housing application data.
- **payOS:** Payment gateway processing domestic subscription purchases and Credit top-ups.

We do not sell, rent, or trade your personal data to any third parties for advertising or marketing purposes.

## 6. Data Storage & Protection

- Your data is stored on secure cloud server infrastructure.
- Conversation data, bot configurations, and technical logs are retained for the duration necessary to provide services, ensure security, resolve disputes, comply with legal obligations, or until the account owner requests deletion via available Dashboard features.
- Credit deduction mechanisms are protected by concurrency locking mechanisms to prevent race condition exploit attacks.
- Web scraping workers operate within isolated, sandboxed environments to prevent memory leakage or cross-tenant data access.

## 7. Rights of Data Subjects

Under applicable laws, you are entitled to the following rights:

1. **Right to Access and Erasure:** You can view, export, or manually delete conversation histories, knowledge documents, and your complete account profile directly via the Dashboard interface.
2. **Right to Restrict Processing:** You can utilize the manual Chatbot On/Off toggle on the Dashboard to instantly suspend chatbot data processing and end-user responses on your website.

## 8. Changes to this Privacy Policy

We may update this Policy periodically to reflect technological, legal, or operational business changes. We will notify you via email or through prominent notices on the Dashboard prior to significant changes taking effect.

## 9. Contact Information

If you have any questions, inquiries, complaints, or requests concerning privacy and data protection on the Vielora platform, please contact the managing entity:

**Titops DX4U Company**

- **Support Email:** contact@vielora.vn
