# Web3 Software Engineering Toolkit

🤩 We are building a comprehensive toolkit for **Software Engineering of Web3**.

## Online

To try our research tools online, please visit the following website:

👉 <https://www.web3-se.com/>

## Tookkit

**Tags: Web3, AI, Software Engineering**

-   🕸️ Web3 Data Crawler
-   🤔 Web3 Data Collection, Labelling, and Analysis
-   🚀 Build, Train, and Evaluate AI Models
-   👀 Data Visualization
-   🤝 Blockchain Network Interactions

### Project-1: SmartBERT

**Task:** Learn representations from smart contracts and provide a service for smart contract embedding.

**Link:** <https://github.com/web3se-lab/SmartBERT>

![SmartBERT API](./imgs/smartbert.png)

**Technical Points:**

-   Convert **smart contract** code context to vectors.
-   Built with **BERT/RoBERTa**-based pre-training models.
-   MLM-trained on **40,000+** real smart contracts.
-   Serving APIs: [tokenize](http://api.smart.cas-ll.cn/smartbert/tokenize), [embed](http://api.smart.cas-ll.cn/smartbert/embed), [code tree](http://api.smart.cas-ll.cn/smartbert/tree).

### Project-2: SmartIntentNN

🤩 **SmartIntentNN** is a deep neural network tool powered by [Tensorflow.js](https://github.com/tensorflow/tfjs).

**Task:** Build a DNN-based model to detect developers' malicious intents in smart contracts.

**Website:** <https://www.web3-se.com>

![SmartIntentNN Example](./imgs/example.png)

**Technical Guide:**

-   ⚙️ Frontend repository: <https://github.com/web3se-lab/web3-sekit-vue>
-   📱 Pages for testing the model online: [Home](https://www.web3-se.com/), [Highlight](https://www.web3-se.com/highlight/), [Evaluation](https://www.web3-se.com/evaluate/)
-   🕵️ Click **"Detect My Smart Contract"** to copy and detect your customized smart contract.
-   🚀 Click **"Predict 🚀"** to detect the malicious intents in smart contracts.
-   🌲 Click **"CCTree 🌲"** to view the smart contract code tree.

**Technical Points:**

-   SmartIntentNN V1.0 is trained and evaluated on **Tensorflow.js**.
-   SmartIntentNN V1.0 employs a **Universal Sentence Encoder** to generate smart contract embeddings.
-   The intent highlight model is trained using **K-means clustering**.
-   SmartIntentNN V2.0 will integrate **SmartBERT** to embed smart contracts.
-   SmartIntentNN V2.0 is currently under construction. Stay tuned! (Maybe see in FSE2025)

## Dataset

**💽 Use our [dataset](https://api.smart.cas-ll.cn)**

The above URL provides a `GET/POST JSON` API.
You can query data by changing the parameter `key` in the URL.

### Smart Contract Intent

<https://api.smart.cas-ll.cn/data/intent?key=1>

Please iterate over keys: `1, 2, 3, ...`. If an error occurs, skip that key and continue (key++, continue)

Ground truth label distribution for Intent data:

| Intent Type    | Explanation                                                                                                      | Num   |
| -------------- | ---------------------------------------------------------------------------------------------------------------- | ----- |
| Fee            | Arbitrarily changes transaction fees, transferring them to specified wallet addresses.                           | 33268 |
| DisableTrading | Enables or disables trading actions on a smart contract.                                                         | 6617  |
| Blacklist      | Restricts designated users' activities, potentially infringing on fair trade rights.                             | 4729  |
| Reflection     | Redistributes taxes from transactions to holders based on their holdings, attracting users to buy native tokens. | 46452 |
| MaxTX          | Limits the maximum number or volume of transactions.                                                             | 17043 |
| Mint           | Issues new tokens, either unlimited or controlled.                                                               | 10572 |
| Honeypot       | Traps user-provided funds under the guise of leaking funds.                                                      | 290   |
| Reward         | Rewards users with crypto assets to encourage token use, despite possible lack of value.                         | 4178  |
| Rebase         | Adjusts token supply algorithmically to control price.                                                           | 659   |
| MaxSell        | Limits specified users' selling times or amounts to lock liquidity.                                              | 68    |

### Smart Contract Vulnerability

<https://api.smart.cas-ll.cn/data/vulnerability?key=1>

Please iterate over keys: `1, 2, 3, ...`. If an error occurs, skip that key and continue (key++, continue)

Ground truth label distribution for Vulnerability data:

| Vulnerability Type           | Num |
| ---------------------------- | --- |
| block number dependency (BN) | 116 |
| timestamp dependency (TP)    | 214 |
| dangerous delegatecall (DE)  | 48  |
| ether frozen (EF)            | 57  |
| ether strict equality (SE)   | 45  |
| integer overflow (OF)        | 23  |
| reentrancy (RE)              | 103 |
| unchecked external call (UC) | 113 |

### Models

🤖 Acces **SmartIntentNN V1.0** models: <https://github.com/web3se-lab/web3-sekit-vue/releases/tag/V1>

-   Download `v1.zip`, then unzip and move them to `/tf/models/v1/`.
-   For **Universal Sentence Encoder**, download <https://tfhub.dev/google/universal-sentence-encoder/4>, then move it to `/tf/models/` and rename the dir as `universal-sentence-encoder`.
-   For **K-means intent highlight model**, download `kmeans-model.json`, then move it to `/tf/models/kmeans-model.json`.

The structure of directory should be like the following figure:

<img height=320px src=./imgs/dir.png>

How to run these models in Tensorflow.js?

-   To predict: `node tf/v1/use-high-bilstm-x2.js predict 1`
-   To evaluate: `node tf/v1/use-high-bilstm-x2.js evaluate`
-   To train: `node tf/v1/use-high-bilstm-x2.js train`
-   To summary: `node tf/v1/use-high-bilstm-x2.js summary`

### Training & Evaluating Settings

See settings in `/tf/v1/model.js`.

**Training**

Scope: 1, 10000
Batch: 200
Batch Size: 50
Epoch: 100

**Evaluating**

Scope: 20000, 10000

## Install

Before using this program, you will need to install **nodejs** and **npm** tools first, then you install dependencies.

Our recommended version is Node.js v16+.

```bash
yarn
# or
npm install
```

## Prepare

Prepare a csv dataset of smart contracts and put them in the directory `/db`.

For BSC Mainnet, download the latest verified contracts from [BSC verified contracts addresses](https://bscscan.com/exportData?type=open-source-contract-codes).

Then, you need to config your own _bscscan_, _etherscan_ [API](https://docs.bscscan.com/api-endpoints/contracts) secret keys in `/src/config/network.json`.

## Database

If you would like to set up a localhost database, we prepare a `docker-compose.yml` for you.

To start a MySQL docker service locally, try:

```bash
yarn mysql
```

To connect to local mysql database, you can create and modify the `.env` as the following content:

```
# DB
DB_DIALECT=mysql
MYSQL_HOST=localhost
MYSQL_USER=web3
MYSQL_PASS=web3
MYSQL_DB=web3

# SMARTBERT
EMBED_API=http://192.168.99.35:8000
WEB_PORT=8081

# for CPU mode
TFJS=@tensorflow/tfjs-node
# for GPU mode
# TFJS=@tensorflow/tfjs-node-gpu
```

Then you can test your database connection and create the initial tables:

```bash

# test connect to databases
yarn DB test

# init tables, if table is not input, default is all the tables
yarn DB init [Table]

# drop tables, be careful!
yarn DB drop [Table]

```

## Web

**Serve Web APIs**

```bash
# development mode
yarn dev
# product mode
yarn start
# stop web service
yarn stop
```

**APIs for dataset**

-   [data/get](http://api.smart.cas-ll.cn/data/get)
-   [data/intent](http://api.smart.cas-ll.cn/data/intent)
-   [data/vulnerability](http://api.smart.cas-ll.cn/data/vulnerability)

**SmartBERT APIs**

-   [tokenize](http://api.smart.cas-ll.cn/smartbert/tokenize)
-   [embed](http://api.smart.cas-ll.cn/smartbert/embed)
-   [token/get](http://api.smart.cas-ll.cn/smartbert/tree)

**POST params**

1. `code` smart contract code content
2. `type` "solidity" or "vyper", the default is "solidity"

EXAMPLE: [embed](http://api.smart.cas-ll.cn/smartbert/embed) is used to convert smart contract code to embedding vectors:

```json
{
    "code": "input solidity code here",
    "type": "solidity"
}
```

## Operation

**Update Contract Table**

Contract API default is from BSC MainNet bscscan.com, you may change network in crawler/updateContract.js

```bash
# crawl from an address
yarn updateContract 0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82

# crawl from csv file in /db
yarn updateContract csv [from=ContractAddress]

# crawl from token list on BSC
yarn updateContract tokens

# label out token contracts, BEP20, 721...
# also add creator, txhash info to Contract table
yarn updateContract labelToken [startId] [endId]

# remove contracts without SourceCode
yarn updateContract removeNull
```

**Update token info in Token table**

For token's basic info, price, bnb LP, busd LP, marketcap, transfers...

```bash
# need UI, from bscscan
yarn updateToken info [start]

# is honeypot and honeypot info
yarn updateToken honeypot [start]

# remove null token
yarn updateToken removeNull

# update and label token risks
# need UI, from scamsniper
yarn updateToken risk [start]
```

**Update from safu**

```bash
# update scam possibility code
yarn safu scam [start] [end]

# simulate buy and update honeypot
yarn safu honeypot [start] [end]
```

**Select data from tables**

```bash
# count total num of contracts
yarn contract count

# get contract info by id, address
yarn contract get [id|address]

# get contract max id
yarn contract max

# check contract address exsited
yarn contract check [address]

# get contracts without SourceCode
yarn contract findNull

# remove contracts without SourceCode
yarn contract removeNull

# get contract network by address
yarn contract network [address]

# get token by id
yarn token get [id]

# get token by address
yarn token get [address]

# count token table rows
yarn token count

# get code data from codes by Id, Address
yarn code get [Id|Address]

# get max Id of code table
yarn code max

# get max compiled code Id from code table
yarn code max-compile

# get max embedding code Id from code table
yarn code max-embedding

# get word id
yarn word getId [word piece]

# get word by id
yarn word getWord [word id]

# count word pieces in table
yarn word count

# get code and risk relations
yarn data code-risk [Id|Address]

# count total types of contracts
yarn data count-token-type

# count different scam intents of risk
yarn data count-scam

# count different levels of risk
yarn data count-risk

# count total honeypots amount in database
yarn data count-honeypot

# generate a json or txt dataset file
yarn data code-txt
yarn data json-txt
```

**Compile and clean source code**

```bash
# compile all to low-level code
yarn updateCode all [start] [end]

# remove unconerned code: comments, heads, imports...
yarn updateCode clean [start] [end]

# extract functions tree map from contracts
yarn updateCode tree [start] [end]
```

**Tokenizer and embedding**

In this project, we use [sentence-piece](https://github.com/google/sentencepiece) as the tokenizer. It implements **BPE** and **unigram language model**.

If you would like to generate your own dataset tokenizer model, you need to prepare a `data.txt` file in `/db/data.txt`.

Install python3 and pip.

```bash
# generate the data.txt
yarn data code-txt
yarn data json-txt

# go to sentence-piece dir
cd tensorflow/models/sentence-piece

# run python
pip install sentencepiece

python3 ./spm.py
```

Then you will get two tokenizer files: `sentencepiece.model` and `sentencepiece.vocab`

We have wrapped a **JS version** of sentence-piece for this project.

To test sentence-piece tokenizer:

```bash
# get a contract's word piece tokens listed by functions
yarn tokenizer get [Id|Address]

# get the max word piece tokens of all the contracts
yarn tokenizer max [start]

# update word dictionary
yarn tokenizer update-word [start]

# count functions in a contract
yarn tokenizer count-fun [id]

# count a max functions contract in table
yarn tokenizer max-fun [start]
```

## Tensorflow.js

**K-means Intent Highlight Model**

```bash
# train k-means model
yarn highlight train [fromId] [slice] [rate] [maxIter]

# load trained highlight k-means model
yarn highlight load

# predict by highlight k-means cluster
yarn highlight predict [Id]
```

**MyModels**

```bash
# train mymodel using BiLSTM and intent highlight scale
yarn mymodel-bilstm-high-scale train [batches] [batchSize] [epoch] [fromId]

# evaluate mymodel using BiLSTM and intent highlight scale
yarn mymodel-bilstm-high-scale evaluate [fromId] [slice] [batchSize]

# predict mymodel using BiLSTM and intent highlight scale
yarn mymodel-bilstm-high-scale predict [fromId] [slice]

# model summary
yarn mymodel-bilstm-high-scale summary

# train model using LSTM
yarn mymodel-lstm evaluate [fromId] [slice] [batchSize]
yarn mymodel-lstm evaluate [batches] [batchSize] [epoch] [fromId]
yarn mymodel-lstm predict [fromId] [slice]

yarn mymodel-bilstm evaluate [fromId] [slice] [batchSize]
yarn mymodel-bilstm evaluate [batches] [batchSize] [epoch] [fromId]
yarn mymodel-bilstm predict [fromId] [slice]

yarn mymodel-cnn evaluate [fromId] [slice] [batchSize]
yarn mymodel-cnn evaluate [batches] [batchSize] [epoch] [fromId]
yarn mymodel-cnn predict [fromId] [slice]

yarn mymodel-bilstm-high-asc evaluate [fromId] [slice] [batchSize]
yarn mymodel-bilstm-high-asc evaluate [batches] [batchSize] [epoch] [fromId]
yarn mymodel-bilstm-high-asc predict [fromId] [slice]

yarn mymodel-bilstm-high-desc evaluate [fromId] [slice] [batchSize]
yarn mymodel-bilstm-high-desc evaluate [batches] [batchSize] [epoch] [fromId]
yarn mymodel-bilstm-high-desc predict [fromId] [slice]
```

We use [sequelize](https://sequelize.org/) to manage a database.

For the details of data structures, please refer to `crawler/Model.js`

## Paper

Continuously writing and updating...

@article{huang2022deep,
title={Deep Smart Contract Intent Detection},
author={Huang, Youwei and Zhang, Tao and Fang, Sen and Tan, Youshuai},
journal={arXiv preprint arXiv:2211.10724},
year={2022}
}

@article{huang2022smartintentnn,
title={SmartIntentNN: Towards Smart Contract Intent Detection},
author={Huang, Youwei and Zhang, Tao and Fang, Sen and Tan, Youshuai},
journal={arXiv preprint arXiv:2211.13670},
year={2022}
}

## Resource

### DataSource

1. [https://bscscan.com/](https://bscscan.com/)
2. [https://etherscan.io/](https://etherscan.io/)
3. [https://tokensniffer.com/](https://tokensniffer.com/)
4. [https://bscheck.eu/](https://bscheck.eu/)
5. [https://scamsniper.net/](https://scamsniper.net/)
6. [https://aphd.github.io/smart-corpus/](https://aphd.github.io/smart-corpus/)
7. [https://dashboard.tenderly.co/explorer/](https://dashboard.tenderly.co/explorer/)
8. [https://tools.staysafu.org/](https://tools.staysafu.org/)

### Dependency

1. [TensorFlow.js](https://js.tensorflow.org/api/latest/)
2. [TensorFlow Hub](https://tfhub.dev/)
3. [Universal Sentence Encoder V4](https://tfhub.dev/google/universal-sentence-encoder/4)
