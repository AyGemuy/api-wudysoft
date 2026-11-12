import axios from "axios";
const SUPPORTED_TYPES = ["BOT", "SERVER", "GAME"];
const SUPPORTED_PLATFORMS = ["DISCORD", "ROBLOX"];
class TopggSearch {
  constructor() {
    this.baseURL = "https://api.top.gg/graphql";
    this.headers = {
      accept: "application/json",
      "accept-language": "en",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://top.gg",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://top.gg/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async _request(query, variables, operationName) {
    try {
      const response = await axios.post(this.baseURL, {
        query: query,
        variables: variables,
        operationName: operationName
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error(`[ERROR] [${operationName}] Request failed:`, error.message);
      throw error;
    }
  }
  _toSnakeCase(obj) {
    if (Array.isArray(obj)) return obj.map(item => this._toSnakeCase(item));
    if (obj !== null && typeof obj === "object") {
      return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
        acc[snakeKey] = this._toSnakeCase(obj[key]);
        return acc;
      }, {});
    }
    return obj;
  }
  _validateParams({
    type,
    platform
  }) {
    const upperType = type?.toUpperCase();
    const upperPlatform = platform?.toUpperCase();
    if (upperType && !SUPPORTED_TYPES.includes(upperType)) {
      throw new Error(`Type "${type}" tidak didukung. Gunakan salah satu: ${SUPPORTED_TYPES.join(", ")}`);
    }
    if (upperPlatform && !SUPPORTED_PLATFORMS.includes(upperPlatform)) {
      throw new Error(`Platform "${platform}" tidak didukung. Gunakan salah satu: ${SUPPORTED_PLATFORMS.join(", ")}`);
    }
    return {
      type: upperType || "BOT",
      platform: upperPlatform || "DISCORD"
    };
  }
  async search({
    query,
    limit = 5,
    review = false,
    limit_rev = 5,
    ...rest
  }) {
    const {
      type,
      platform
    } = this._validateParams({
      type: rest.type,
      platform: rest.platform
    });
    const entitiesQuery = `
      query Entities($numAds: Int, $input: EntitiesListingParametersInput!) {
        entitiesV2(input: $input) {
          advertisements(input: {numAds: $numAds}) { ...AdItem }
          nodes { ...EntityItem }
        }
      }
      fragment AdItem on Ad {
        __typename title description imageUrl actionType
        entity { ...EntityItem }
        eventToken url
      }
      fragment EntityItem on Entity {
        ...MinimalEntity icon votes nsfwLevel
        tags { ...TagItem }
        socialCount createdAt reviewStatus
        reviewStats {
          averageScore reviewCount
          scoreDistribution { key value }
        }
        ... on DiscordServer { inviteCode serverTag { slug iconUrl } }
        ... on RobloxGame { playCount onlinePlayerCount }
      }
      fragment MinimalEntity on Entity {
        __typename id: externalId internalId: id type platform name iconUrl shortDescription
      }
      fragment TagItem on Tag { count slug displayName parentSlug }
    `;
    const variables = {
      numAds: 0,
      input: {
        limit: limit,
        skip: 0,
        platform: platform,
        type: type,
        searchQuery: query,
        tagSlugs: [],
        languageCodes: [],
        discordServer: {},
        ...rest,
        type: type,
        platform: platform
      }
    };
    try {
      const response = await this._request(entitiesQuery, variables, "Entities");
      const nodes = response?.data?.entitiesV2?.nodes ?? [];
      if (review && nodes.length > 0) {
        const reviewQuery = `
          query EntityReviews($id: String!, $limit: Int!, $skip: Int!, $sort: ReviewSortOrder) {
            reviews(id: $id, limit: $limit, skip: $skip, sortOrder: $sort) { ...ReviewItem }
          }
          fragment ReviewItem on Review {
            id score content hasVoted entityId isFlagged flaggedAt editedAt timestamp voteCount
            reply { id content posterId }
            poster { id username avatarUrl }
          }
        `;
        for (const entity of nodes) {
          if (!entity.internalId) {
            entity.reviews = [];
            continue;
          }
          try {
            const revVariables = {
              id: entity.internalId,
              limit: limit_rev,
              skip: 0,
              sort: "HOT"
            };
            const res = await this._request(reviewQuery, revVariables, "EntityReviews");
            entity.reviews = res?.data?.reviews ?? [];
          } catch {
            entity.reviews = [];
          }
        }
      }
      return {
        status: "success",
        result: this._toSnakeCase(nodes)
      };
    } catch (error) {
      return {
        status: "error",
        message: error.message,
        result: []
      };
    }
  }
  async detail({
    id,
    ...rest
  }) {
    if (!id) {
      return {
        status: "error",
        message: "ID diperlukan"
      };
    }
    const query = `
      query EntityQuery($id: String!) {
        entity(id: $id) {
          ...FullEntityItem
        }
      }

      fragment FullEntityItem on Entity {
        ...EntityItem
        deprecatedAt
        languages {
          displayName
          identifier
        }
        longDescription
        team {
          ...TeamItem
        }
        owners {
          id
          username
          avatarUrl
          connections {
            type
            id
          }
        }
        backgroundUrl
        socials {
          displayName
          handle
          type
          url
        }
        features {
          ...EntityFeatureItem
        }
        similarEntities {
          ...EntityItem
        }
        reviewStatus
        ... on DiscordBot {
          applicationId
          inviteUrl
          prefix
          sampleGuilds
          vanityUrl
          supportServerInviteCode
          websiteUrl
          githubUrl
          noteForReviewer
          certified
          commands {
            ...CommandItem
          }
          supportServer {
            ...EntityItem
          }
        }
        ... on DiscordServer {
          inviteCode
          reachable
          serverTag {
            slug
            iconUrl
          }
          serverActivity {
            activityItems {
              hour
              activityRatio
            }
            growthRatio
            percentile
          }
        }
        ... on RobloxGame {
          rootPlaceId
        }
      }

      fragment EntityItem on Entity {
        ...MinimalEntity
        icon
        votes
        nsfwLevel
        tags {
          ...TagItem
        }
        socialCount
        createdAt
        reviewStatus
        reviewStats {
          averageScore
          reviewCount
          scoreDistribution {
            key
            value
          }
        }
        ... on DiscordServer {
          inviteCode
          serverTag {
            slug
            iconUrl
          }
        }
        ... on RobloxGame {
          playCount
          onlinePlayerCount
        }
      }

      fragment MinimalEntity on Entity {
        __typename
        id: externalId
        internalId: id
        type
        platform
        name
        iconUrl
        shortDescription
      }

      fragment TagItem on Tag {
        count
        slug
        displayName
        parentSlug
      }

      fragment CommandItem on BotCommand {
        name
        description
        isNsfw
      }

      fragment FeatureDefinitionItem on FeatureDefinition {
        id
        name
        description
        valueKind
        type
        platform
        tags
        enumOptions {
          description
          label
          value
        }
      }

      fragment EntityFeatureItem on EntityFeature {
        definition {
          ...FeatureDefinitionItem
        }
        valueEnum
      }

      fragment TeamItem on Team {
        id
        ownerId
        name
        avatar
        description
        members {
          user {
            id
            username
            avatarUrl
          }
          role
        }
      }
    `;
    try {
      const response = await this._request(query, {
        id: id
      }, "EntityQuery");
      const entity = response?.data?.entity;
      if (!entity) {
        return {
          status: "error",
          message: "Entitas tidak ditemukan"
        };
      }
      return {
        status: "success",
        result: this._toSnakeCase(entity)
      };
    } catch (error) {
      return {
        status: "error",
        message: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const rawParams = req.method === "GET" ? req.query : req.body;
  const {
    action,
    ...params
  } = rawParams;
  const validActions = ["search", "detail"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          search: "/?action=search&query=bake",
          detail: "/?action=detail&id=123456"
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new TopggSearch();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/?action=search&query=bake"
          });
        }
        response = await api.search(params);
        break;
      case "detail":
        if (!params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'id' wajib diisi untuk action 'detail'.",
            example: "/?action=detail&id=12345"
          });
        }
        response = await api.detail(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons. Coba lagi nanti."
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server scraper.",
      error: error.message || "Unknown Error"
    });
  }
}