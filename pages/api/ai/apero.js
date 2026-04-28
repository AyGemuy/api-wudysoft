import axios from "axios";
import {
  randomUUID
} from "crypto";
const BASE_URLS = {
  ACCOUNT: "https://llm-account-service.aperogroup.ai",
  AI_METART: "https://api-metart.aperogroup.ai",
  IMG_GEN_WRAPPER: "https://api-img-gen-wrapper.aperogroup.ai",
  ART_PREMIUM: "https://art-premium-core.aperogroup.ai",
  BEAUTY: "https://beauty-core.aperogroup.ai",
  CLOTHES: "https://cloth-change-core.aperogroup.ai",
  ENHANCE: "https://enhance-core.aperogroup.ai",
  OUTPAINT: "https://core-outpaint.aperogroup.ai",
  FITTING: "https://fitting-core.aperogroup.ai",
  RESTORE: "https://image-restore-core.aperogroup.ai",
  REMOVE_OBJECT: "https://objectremoval-core.aperogroup.ai",
  SEGMENT: "https://segment-core.aperogroup.ai",
  STYLE_MANAGER: "https://api-style-manager.aperogroup.ai",
  CONTENT_MANAGEMENT: "https://content-management.dev.aperogroup.ai",
  VIDEO_GEN: "https://video-gen-core.aperogroup.ai"
};
const EP = {
  SILENT_LOGIN: "/saas-user-service/v1/users/silent-login",
  GET_CATEGORIES: "/api/v1/strapi/categories",
  GET_CATEGORY_TEMPLATES: "/api/v1/strapi/categories/{categoryId}/templates",
  PRESIGNED_URL: "/api/ai-generation/presigned-url",
  GENERATE_IMAGE: "/api/ai-generation/image",
  TIMESTAMP: "/timestamp",
  ART_AI_PRESIGNED: "/api/v5/image-ai/presigned-link",
  ART_AI_GENERATE: "/api/v5/image-ai",
  ART_PREMIUM_PRESIGNED: "/api/v5/art-premium/presigned-link",
  ART_PREMIUM_GENERATE: "/api/v5/art-premium",
  ENHANCE_PRESIGNED: "/api/v5/image-enhance/presigned-link",
  ENHANCE_GENERATE: "/api/v5/image-enhance",
  BEAUTY_PRESIGNED: "/api/v5/beauty/presigned-link",
  BEAUTY_GENERATE: "/api/v5/beauty",
  BODY_BEAUTIFY_V4: "/api/v4/beauty",
  CLOTHES_PRESIGNED: "/api/v5/clothes-changing/presigned-link",
  CLOTHES_GENERATE: "/api/v5/clothes-changing",
  FITTING_PRESIGNED: "/api/v5/fitting/presigned-link",
  FITTING_GENERATE: "/api/v5/fitting",
  REMOVE_BG_PRESIGNED: "/api/v5/remove-background/presigned-link",
  REMOVE_BG_GENERATE: "/api/v5/remove-background",
  REMOVE_OBJECT_PRESIGNED: "/api/v5/remove-object/presigned-link",
  REMOVE_OBJECT_GENERATE: "/api/v5/remove-object",
  SEGMENT_PRESIGNED: "/api/v5/segment/presigned-link",
  SEGMENT_GENERATE: "/api/v5/segment",
  RESTORE_PRESIGNED: "/api/v5/image-restore/presigned-link",
  RESTORE_GENERATE: "/api/v5/image-restore",
  EXPAND_PRESIGNED: "/api/v5/image-outpainting/presigned-link",
  EXPAND_GENERATE: "/api/v5/image-outpainting",
  INPAINTING_GENERATE: "/api/v1/image-inpainting",
  ANIMAL_FUSION_PRESIGNED: "/api/v5/image-2-video/presigned-link",
  ANIMAL_FUSION_GENERATE: "/api/v5/image-2-video",
  ANIMAL_FUSION_VIDEO_INFO: "/api/v5/image-2-video/video/{videoId}",
  TEXT_TO_IMAGE_GENERATE: "/api/v5/premium/text-2-image",
  QWEN_PRESIGNED: "/api/v5.1/qwen-editing/presigned-link",
  QWEN_GENERATE: "/api/v5.1/qwen-editing",
  AI_STYLES: "/category",
  STYLE_EXTERNAL: "/style-external/styles",
  BEAUTY_STYLES_CMS: "/api/aip-698s"
};
const Req = {
  SilentLogin: d => ({
    deviceId: d
  }),
  PresignedUrl: fName => ({
    fileName: fName
  }),
  GenerateImage: ({
    id: dId,
    ...rest
  }) => ({
    documentId: dId,
    input: {
      ...rest
    }
  })
};
class AperoApi {
  constructor() {
    this.accessToken = null;
    this.loginPromise = null;
    this.config = {
      BUNDLE_ID: "tera.aiartgenerator.aiphoto.aiphotoenhancer",
      DEVICE_ID: randomUUID()
    };
    this.baseHeaders = {
      "x-api-bundleId": this.config.BUNDLE_ID,
      "Content-Type": "application/json"
    };
    console.log(`[INIT] Device ID baru: ${this.config.DEVICE_ID}`);
    this.loginPromise = this._performSilentLogin();
  }
  async _performSilentLogin() {
    console.log("1. Melakukan Silent Login...");
    try {
      const url = BASE_URLS.ACCOUNT + EP.SILENT_LOGIN;
      const {
        data
      } = await axios.post(url, Req.SilentLogin(this.config.DEVICE_ID), {
        headers: this.baseHeaders
      });
      console.log("\n   >>> RESPON DATA ASLI (Login):");
      console.log(JSON.stringify(data, null, 2));
      const accessToken = data.data?.accessToken;
      if (!accessToken) throw new Error("Token tidak ditemukan dalam respons.");
      this.accessToken = accessToken;
      console.log(`\n   -> OK. Token diperoleh dan disimpan.`);
      return accessToken;
    } catch (e) {
      console.error("\n--- LOGIN GAGAL KRITIS ---");
      console.error(`[Login GAGAL] Status: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
      throw e;
    }
  }
  async ensureLogin() {
    if (!this.loginPromise) throw new Error("AperoApi tidak diinisialisasi dengan benar.");
    await this.loginPromise;
    return {
      ...this.baseHeaders,
      Authorization: `Bearer ${this.accessToken}`
    };
  }
  async _get(baseUrl, endpoint, params = {}) {
    const authHeaders = await this.ensureLogin();
    const {
      data
    } = await axios.get(baseUrl + endpoint, {
      headers: authHeaders,
      params: params
    });
    return data?.data ?? data;
  }
  async _post(baseUrl, endpoint, body = {}) {
    const authHeaders = await this.ensureLogin();
    const {
      data
    } = await axios.post(baseUrl + endpoint, body, {
      headers: authHeaders
    });
    return data?.data ?? data;
  }
  async processFileInput(fileInput) {
    if (Buffer.isBuffer(fileInput)) return fileInput;
    if (typeof fileInput === "string") {
      if (fileInput.startsWith("http")) {
        console.log(`   -> Downloading file from URL: ${fileInput}`);
        const response = await axios.get(fileInput, {
          responseType: "arraybuffer"
        });
        return Buffer.from(response.data);
      } else if (fileInput.startsWith("data:")) {
        console.log(`   -> Processing base64 data`);
        return Buffer.from(fileInput.split(",")[1], "base64");
      } else if (fileInput.length > 100) {
        console.log(`   -> Processing plain base64 data`);
        return Buffer.from(fileInput, "base64");
      }
    }
    throw new Error("Unsupported file input type. Support: Buffer, URL, Base64");
  }
  async _uploadToPresignedUrl(presignedUrl, fileBuffer) {
    await axios.put(presignedUrl, fileBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": fileBuffer.length
      }
    });
  }
  async _presignAndProcess(presignedBaseUrl, presignedEndpoint, processBaseUrl, processEndpoint, fileInput, body) {
    const presignedData = await this._get(presignedBaseUrl, presignedEndpoint);
    const uploadUrl = presignedData?.url || presignedData?.presignedUrl;
    if (!uploadUrl) throw new Error("Presigned URL tidak ditemukan dalam respons.");
    const fileBuffer = await this.processFileInput(fileInput);
    console.log(`   -> Uploading (${fileBuffer.length} bytes)...`);
    await this._uploadToPresignedUrl(uploadUrl, fileBuffer);
    console.log(`   -> Upload sukses.`);
    return this._post(processBaseUrl, processEndpoint, body);
  }
  async autoPresignAndUpload(fileInput, fileName = `user-uploads/input_${randomUUID()}.png`) {
    console.log(`\n   Auto Presign & Upload untuk: ${fileName}`);
    const presignedData = await this.presigned({
      fileName: fileName
    });
    const {
      presignedUrl,
      objectKey
    } = presignedData;
    const fileBuffer = await this.processFileInput(fileInput);
    console.log(`   -> Uploading file (${fileBuffer.length} bytes) to presigned URL`);
    await this._uploadToPresignedUrl(presignedUrl, fileBuffer);
    console.log(`   -> Upload successful! Object Key: ${objectKey}`);
    return {
      presignedUrl: presignedUrl,
      objectKey: objectKey,
      fileSize: fileBuffer.length
    };
  }
  async categories() {
    console.log("\n2. Mendapatkan Kategori...");
    try {
      const result = await this._get(BASE_URLS.AI_METART, EP.GET_CATEGORIES, {
        page: 1,
        limit: 10
      });
      console.log("\n   >>> RESPON DATA ASLI (Kategori):");
      console.log(JSON.stringify(result, null, 2));
      return result;
    } catch (e) {
      throw new Error(`[Get Categories GAGAL] Status: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }
  }
  async templates({
    id: categoryId
  }) {
    console.log(`\n3. Mendapatkan Template untuk Category ID: ${categoryId}...`);
    try {
      const endpoint = EP.GET_CATEGORY_TEMPLATES.replace("{categoryId}", categoryId);
      const result = await this._get(BASE_URLS.AI_METART, endpoint);
      console.log("\n   >>> RESPON DATA ASLI (Template):");
      console.log(JSON.stringify(result, null, 2));
      return result;
    } catch (e) {
      throw new Error(`[Get Templates GAGAL] Status: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }
  }
  async presigned({
    fileName = `user-uploads/input_${randomUUID()}.png`
  } = {}) {
    console.log("\n4. Meminta Presigned URL...");
    try {
      const result = await this._post(BASE_URLS.AI_METART, EP.PRESIGNED_URL, Req.PresignedUrl(fileName));
      console.log("\n   >>> RESPON DATA ASLI (Presigned URL):");
      console.log(JSON.stringify(result, null, 2));
      return result;
    } catch (e) {
      throw new Error(`[Presigned URL GAGAL] Status: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }
  }
  async generate({
    id: documentId,
    files,
    ...rest
  }) {
    console.log("\n5. Meminta Generate Image...");
    try {
      let processedInput = {
        ...rest
      };
      if (files) {
        console.log(`   -> Processing ${Array.isArray(files) ? files.length : 1} file(s)`);
        if (Array.isArray(files)) {
          const results = [];
          for (let i = 0; i < files.length; i++) {
            console.log(`   -> Processing file ${i + 1} of ${files.length}`);
            const r = await this.autoPresignAndUpload(files[i], `user-uploads/input_${randomUUID()}_${i}.png`);
            results.push(r);
          }
          processedInput.files = results.map(r => r.objectKey);
        } else {
          const r = await this.autoPresignAndUpload(files);
          processedInput.files = r.objectKey;
        }
      }
      const reqBody = Req.GenerateImage({
        id: documentId,
        ...processedInput
      });
      console.log("\n   >>> REQUEST BODY (Generate Image):");
      console.log(JSON.stringify(reqBody, null, 2));
      const result = await this._post(BASE_URLS.AI_METART, EP.GENERATE_IMAGE, reqBody);
      console.log("\n   >>> RESPON DATA ASLI (Generate Image):");
      console.log(JSON.stringify(result, null, 2));
      return result;
    } catch (e) {
      throw new Error(`[Generate GAGAL] Status: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }
  }
  async getTimestamp() {
    console.log("\n[Timestamp] Mengambil server timestamp...");
    return this._get(BASE_URLS.IMG_GEN_WRAPPER, EP.TIMESTAMP);
  }
  async getArtAiPresignedLink() {
    return this._get(BASE_URLS.IMG_GEN_WRAPPER, EP.ART_AI_PRESIGNED);
  }
  async genArtAi(body) {
    console.log("\n[Art AI] Generate...");
    return this._post(BASE_URLS.IMG_GEN_WRAPPER, EP.ART_AI_GENERATE, body);
  }
  async genArtAiWithUpload(fileInput, body) {
    return this._presignAndProcess(BASE_URLS.IMG_GEN_WRAPPER, EP.ART_AI_PRESIGNED, BASE_URLS.IMG_GEN_WRAPPER, EP.ART_AI_GENERATE, fileInput, body);
  }
  async getArtPremiumPresignedLink() {
    return this._get(BASE_URLS.ART_PREMIUM, EP.ART_PREMIUM_PRESIGNED);
  }
  async genArtAiPremium(body) {
    console.log("\n[Art Premium] Generate...");
    return this._post(BASE_URLS.ART_PREMIUM, EP.ART_PREMIUM_GENERATE, body);
  }
  async genArtPremiumWithUpload(fileInput, body) {
    return this._presignAndProcess(BASE_URLS.ART_PREMIUM, EP.ART_PREMIUM_PRESIGNED, BASE_URLS.ART_PREMIUM, EP.ART_PREMIUM_GENERATE, fileInput, body);
  }
  async getEnhancePresignedLink() {
    return this._get(BASE_URLS.ENHANCE, EP.ENHANCE_PRESIGNED);
  }
  async genEnhanceImage(body) {
    console.log("\n[Enhance] Generate...");
    return this._post(BASE_URLS.ENHANCE, EP.ENHANCE_GENERATE, body);
  }
  async genEnhanceWithUpload(fileInput, body) {
    return this._presignAndProcess(BASE_URLS.ENHANCE, EP.ENHANCE_PRESIGNED, BASE_URLS.ENHANCE, EP.ENHANCE_GENERATE, fileInput, body);
  }
  async getBeautyPresignedLink() {
    return this._get(BASE_URLS.BEAUTY, EP.BEAUTY_PRESIGNED);
  }
  async genFaceBeautyImage(body) {
    console.log("\n[Face Beauty] Generate...");
    return this._post(BASE_URLS.BEAUTY, EP.BEAUTY_GENERATE, body);
  }
  async genBodyBeautifyImage(body) {
    console.log("\n[Body Beautify] Generate...");
    return this._post(BASE_URLS.BEAUTY, EP.BEAUTY_GENERATE, body);
  }
  async genBodyBeautifyImageV4(formData) {
    console.log("\n[Body Beautify V4] Generate...");
    const authHeaders = await this.ensureLogin();
    const {
      data
    } = await axios.post(BASE_URLS.BEAUTY + EP.BODY_BEAUTIFY_V4, formData, {
      headers: {
        ...authHeaders,
        "Content-Type": undefined
      }
    });
    return data?.data ?? data;
  }
  async genFaceBeautyWithUpload(fileInput, body) {
    return this._presignAndProcess(BASE_URLS.BEAUTY, EP.BEAUTY_PRESIGNED, BASE_URLS.BEAUTY, EP.BEAUTY_GENERATE, fileInput, body);
  }
  async getClothesPresignedLink() {
    return this._get(BASE_URLS.CLOTHES, EP.CLOTHES_PRESIGNED);
  }
  async genClothesImage(body) {
    console.log("\n[Clothes Changing] Generate...");
    return this._post(BASE_URLS.CLOTHES, EP.CLOTHES_GENERATE, body);
  }
  async genClothesWithUpload(fileInput, body) {
    return this._presignAndProcess(BASE_URLS.CLOTHES, EP.CLOTHES_PRESIGNED, BASE_URLS.CLOTHES, EP.CLOTHES_GENERATE, fileInput, body);
  }
  async getFittingPresignedLink() {
    return this._get(BASE_URLS.FITTING, EP.FITTING_PRESIGNED);
  }
  async getFittingImage(body) {
    console.log("\n[Fitting] Generate...");
    return this._post(BASE_URLS.FITTING, EP.FITTING_GENERATE, body);
  }
  async genFittingWithUpload(fileInput, body) {
    return this._presignAndProcess(BASE_URLS.FITTING, EP.FITTING_PRESIGNED, BASE_URLS.FITTING, EP.FITTING_GENERATE, fileInput, body);
  }
  async getRemoveBgPresignedLink() {
    return this._get(BASE_URLS.OUTPAINT, EP.REMOVE_BG_PRESIGNED);
  }
  async genRemoveBgImage(body) {
    console.log("\n[Remove BG] Generate...");
    return this._post(BASE_URLS.OUTPAINT, EP.REMOVE_BG_GENERATE, body);
  }
  async genRemoveBgWithUpload(fileInput, body) {
    return this._presignAndProcess(BASE_URLS.OUTPAINT, EP.REMOVE_BG_PRESIGNED, BASE_URLS.OUTPAINT, EP.REMOVE_BG_GENERATE, fileInput, body);
  }
  async getRemoveObjectPresignedLink() {
    return this._get(BASE_URLS.REMOVE_OBJECT, EP.REMOVE_OBJECT_PRESIGNED);
  }
  async removeObjectImage(body) {
    console.log("\n[Remove Object] Generate...");
    return this._post(BASE_URLS.REMOVE_OBJECT, EP.REMOVE_OBJECT_GENERATE, body);
  }
  async removeObjectWithUpload(fileInput, body) {
    return this._presignAndProcess(BASE_URLS.REMOVE_OBJECT, EP.REMOVE_OBJECT_PRESIGNED, BASE_URLS.REMOVE_OBJECT, EP.REMOVE_OBJECT_GENERATE, fileInput, body);
  }
  async getSegmentPresignedLink() {
    return this._get(BASE_URLS.SEGMENT, EP.SEGMENT_PRESIGNED);
  }
  async getSegmentationObject(body) {
    console.log("\n[Segmentation] Generate...");
    return this._post(BASE_URLS.SEGMENT, EP.SEGMENT_GENERATE, body);
  }
  async genSegmentationWithUpload(fileInput, body) {
    return this._presignAndProcess(BASE_URLS.SEGMENT, EP.SEGMENT_PRESIGNED, BASE_URLS.SEGMENT, EP.SEGMENT_GENERATE, fileInput, body);
  }
  async getRestorePresignedLink() {
    return this._get(BASE_URLS.RESTORE, EP.RESTORE_PRESIGNED);
  }
  async genRestoreImage(body) {
    console.log("\n[Restore] Generate...");
    return this._post(BASE_URLS.RESTORE, EP.RESTORE_GENERATE, body);
  }
  async genRestoreWithUpload(fileInput, body) {
    return this._presignAndProcess(BASE_URLS.RESTORE, EP.RESTORE_PRESIGNED, BASE_URLS.RESTORE, EP.RESTORE_GENERATE, fileInput, body);
  }
  async getExpandPresignedLink() {
    return this._get(BASE_URLS.OUTPAINT, EP.EXPAND_PRESIGNED);
  }
  async genExpandImage(body) {
    console.log("\n[Expand/Outpainting] Generate...");
    return this._post(BASE_URLS.OUTPAINT, EP.EXPAND_GENERATE, body);
  }
  async genExpandWithUpload(fileInput, body) {
    return this._presignAndProcess(BASE_URLS.OUTPAINT, EP.EXPAND_PRESIGNED, BASE_URLS.OUTPAINT, EP.EXPAND_GENERATE, fileInput, body);
  }
  async genInPaintingImage(formData) {
    console.log("\n[Inpainting] Generate...");
    const authHeaders = await this.ensureLogin();
    const {
      data
    } = await axios.post(BASE_URLS.IMG_GEN_WRAPPER + EP.INPAINTING_GENERATE, formData, {
      headers: {
        ...authHeaders,
        "Content-Type": undefined
      }
    });
    return data?.data ?? data;
  }
  async getAnimalFusionPresignedLink() {
    return this._get(BASE_URLS.VIDEO_GEN, EP.ANIMAL_FUSION_PRESIGNED);
  }
  async generateVideo(body) {
    console.log("\n[Animal Fusion / Video] Generate...");
    return this._post(BASE_URLS.VIDEO_GEN, EP.ANIMAL_FUSION_GENERATE, body);
  }
  async getVideoInfo(videoId) {
    console.log(`\n[Video Info] Polling videoId: ${videoId}...`);
    const endpoint = EP.ANIMAL_FUSION_VIDEO_INFO.replace("{videoId}", videoId);
    return this._get(BASE_URLS.VIDEO_GEN, endpoint);
  }
  async generateVideoWithUpload(fileInput, body) {
    return this._presignAndProcess(BASE_URLS.VIDEO_GEN, EP.ANIMAL_FUSION_PRESIGNED, BASE_URLS.VIDEO_GEN, EP.ANIMAL_FUSION_GENERATE, fileInput, body);
  }
  async generateImageFromText(body) {
    console.log("\n[Text to Image] Generate...");
    return this._post(BASE_URLS.IMG_GEN_WRAPPER, EP.TEXT_TO_IMAGE_GENERATE, body);
  }
  async downloadImage(imageUrl) {
    console.log(`\n[Download Image] URL: ${imageUrl}`);
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer"
    });
    return Buffer.from(response.data);
  }
  async getQwenPresignedLink() {
    return this._get(BASE_URLS.IMG_GEN_WRAPPER, EP.QWEN_PRESIGNED);
  }
  async generateQwenImage(body) {
    console.log("\n[Qwen Editing] Generate...");
    return this._post(BASE_URLS.IMG_GEN_WRAPPER, EP.QWEN_GENERATE, body);
  }
  async generateQwenWithUpload(fileInput, body) {
    return this._presignAndProcess(BASE_URLS.IMG_GEN_WRAPPER, EP.QWEN_PRESIGNED, BASE_URLS.IMG_GEN_WRAPPER, EP.QWEN_GENERATE, fileInput, body);
  }
  async getAiStyles(appName, styleType, isApp = true, segmentValue) {
    console.log("\n[AI Styles] Mengambil kategori style...");
    return this._get(BASE_URLS.STYLE_MANAGER, EP.AI_STYLES, {
      project: appName,
      styleType: styleType,
      isApp: isApp,
      segmentValue: segmentValue
    });
  }
  async getClothes(appName, sheet) {
    return this._get(BASE_URLS.STYLE_MANAGER, EP.STYLE_EXTERNAL, {
      appName: appName,
      sheet: sheet
    });
  }
  async getArtStyles(appName, sheet) {
    return this._get(BASE_URLS.STYLE_MANAGER, EP.STYLE_EXTERNAL, {
      appName: appName,
      sheet: sheet
    });
  }
  async getArtPremiumStyles(appName, sheet) {
    return this._get(BASE_URLS.STYLE_MANAGER, EP.STYLE_EXTERNAL, {
      appName: appName,
      sheet: sheet
    });
  }
  async getAnimalFusionStyles(appName, sheet) {
    return this._get(BASE_URLS.STYLE_MANAGER, EP.STYLE_EXTERNAL, {
      appName: appName,
      sheet: sheet
    });
  }
  async getBeautyStyles({
    pageNumber = 1,
    itemsPerPage = 20,
    sortCriteria = "id:asc",
    populateFields = "*"
  } = {}) {
    console.log("\n[Beauty Styles CMS] Mengambil beauty styles...");
    return this._get(BASE_URLS.CONTENT_MANAGEMENT, EP.BEAUTY_STYLES_CMS, {
      "pagination[page]": pageNumber,
      "pagination[pageSize]": itemsPerPage,
      "sort[0]": sortCriteria,
      populate: populateFields
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Parameter 'action' wajib diisi."
    });
  }
  const api = new AperoApi();
  try {
    let response;
    switch (action) {
      case "categories":
        response = await api.categories();
        break;
      case "templates":
        if (!params.id) return res.status(400).json({
          error: "Parameter 'id' wajib diisi untuk action 'templates'."
        });
        response = await api.templates(params);
        break;
      case "generate":
        if (!params.id) return res.status(400).json({
          error: "Parameter 'id' wajib diisi untuk action 'generate'."
        });
        response = await api.generate(params);
        break;
      case "timestamp":
        response = await api.getTimestamp();
        break;
      case "artAiPresigned":
        response = await api.getArtAiPresignedLink();
        break;
      case "artAi":
        response = await api.genArtAi(params);
        break;
      case "artAiWithUpload":
        if (!params.file) return res.status(400).json({
          error: "Parameter 'file' wajib diisi."
        });
        response = await api.genArtAiWithUpload(params.file, params.body ?? {});
        break;
      case "artPremiumPresigned":
        response = await api.getArtPremiumPresignedLink();
        break;
      case "artPremium":
        response = await api.genArtAiPremium(params);
        break;
      case "artPremiumWithUpload":
        if (!params.file) return res.status(400).json({
          error: "Parameter 'file' wajib diisi."
        });
        response = await api.genArtPremiumWithUpload(params.file, params.body ?? {});
        break;
      case "enhancePresigned":
        response = await api.getEnhancePresignedLink();
        break;
      case "enhance":
        response = await api.genEnhanceImage(params);
        break;
      case "enhanceWithUpload":
        if (!params.file) return res.status(400).json({
          error: "Parameter 'file' wajib diisi."
        });
        response = await api.genEnhanceWithUpload(params.file, params.body ?? {});
        break;
      case "beautyPresigned":
        response = await api.getBeautyPresignedLink();
        break;
      case "faceBeauty":
        response = await api.genFaceBeautyImage(params);
        break;
      case "bodyBeautify":
        response = await api.genBodyBeautifyImage(params);
        break;
      case "faceBeautyWithUpload":
        if (!params.file) return res.status(400).json({
          error: "Parameter 'file' wajib diisi."
        });
        response = await api.genFaceBeautyWithUpload(params.file, params.body ?? {});
        break;
      case "clothesPresigned":
        response = await api.getClothesPresignedLink();
        break;
      case "clothes":
        response = await api.genClothesImage(params);
        break;
      case "clothesWithUpload":
        if (!params.file) return res.status(400).json({
          error: "Parameter 'file' wajib diisi."
        });
        response = await api.genClothesWithUpload(params.file, params.body ?? {});
        break;
      case "fittingPresigned":
        response = await api.getFittingPresignedLink();
        break;
      case "fitting":
        response = await api.getFittingImage(params);
        break;
      case "fittingWithUpload":
        if (!params.file) return res.status(400).json({
          error: "Parameter 'file' wajib diisi."
        });
        response = await api.genFittingWithUpload(params.file, params.body ?? {});
        break;
      case "removeBgPresigned":
        response = await api.getRemoveBgPresignedLink();
        break;
      case "removeBg":
        response = await api.genRemoveBgImage(params);
        break;
      case "removeBgWithUpload":
        if (!params.file) return res.status(400).json({
          error: "Parameter 'file' wajib diisi."
        });
        response = await api.genRemoveBgWithUpload(params.file, params.body ?? {});
        break;
      case "removeObjectPresigned":
        response = await api.getRemoveObjectPresignedLink();
        break;
      case "removeObject":
        response = await api.removeObjectImage(params);
        break;
      case "removeObjectWithUpload":
        if (!params.file) return res.status(400).json({
          error: "Parameter 'file' wajib diisi."
        });
        response = await api.removeObjectWithUpload(params.file, params.body ?? {});
        break;
      case "segmentPresigned":
        response = await api.getSegmentPresignedLink();
        break;
      case "segment":
        response = await api.getSegmentationObject(params);
        break;
      case "segmentWithUpload":
        if (!params.file) return res.status(400).json({
          error: "Parameter 'file' wajib diisi."
        });
        response = await api.genSegmentationWithUpload(params.file, params.body ?? {});
        break;
      case "restorePresigned":
        response = await api.getRestorePresignedLink();
        break;
      case "restore":
        response = await api.genRestoreImage(params);
        break;
      case "restoreWithUpload":
        if (!params.file) return res.status(400).json({
          error: "Parameter 'file' wajib diisi."
        });
        response = await api.genRestoreWithUpload(params.file, params.body ?? {});
        break;
      case "expandPresigned":
        response = await api.getExpandPresignedLink();
        break;
      case "expand":
        response = await api.genExpandImage(params);
        break;
      case "expandWithUpload":
        if (!params.file) return res.status(400).json({
          error: "Parameter 'file' wajib diisi."
        });
        response = await api.genExpandWithUpload(params.file, params.body ?? {});
        break;
      case "inpainting":
        response = await api.genInPaintingImage(params);
        break;
      case "animalFusionPresigned":
        response = await api.getAnimalFusionPresignedLink();
        break;
      case "animalFusion":
        response = await api.generateVideo(params);
        break;
      case "videoInfo":
        if (!params.videoId) return res.status(400).json({
          error: "Parameter 'videoId' wajib diisi."
        });
        response = await api.getVideoInfo(params.videoId);
        break;
      case "animalFusionWithUpload":
        if (!params.file) return res.status(400).json({
          error: "Parameter 'file' wajib diisi."
        });
        response = await api.generateVideoWithUpload(params.file, params.body ?? {});
        break;
      case "textToImage":
        response = await api.generateImageFromText(params);
        break;
      case "downloadImage":
        if (!params.imageUrl) return res.status(400).json({
          error: "Parameter 'imageUrl' wajib diisi."
        });
        response = await api.downloadImage(params.imageUrl);
        break;
      case "qwenPresigned":
        response = await api.getQwenPresignedLink();
        break;
      case "qwen":
        response = await api.generateQwenImage(params);
        break;
      case "qwenWithUpload":
        if (!params.file) return res.status(400).json({
          error: "Parameter 'file' wajib diisi."
        });
        response = await api.generateQwenWithUpload(params.file, params.body ?? {});
        break;
      case "aiStyles":
        response = await api.getAiStyles(params.appName, params.styleType, params.isApp, params.segmentValue);
        break;
      case "clothesList":
        response = await api.getClothes(params.appName, params.sheet);
        break;
      case "artStyles":
        response = await api.getArtStyles(params.appName, params.sheet);
        break;
      case "artPremiumStyles":
        response = await api.getArtPremiumStyles(params.appName, params.sheet);
        break;
      case "animalFusionStyles":
        response = await api.getAnimalFusionStyles(params.appName, params.sheet);
        break;
      case "beautyStyles":
        response = await api.getBeautyStyles({
          pageNumber: params.pageNumber,
          itemsPerPage: params.itemsPerPage,
          sortCriteria: params.sortCriteria,
          populateFields: params.populateFields
        });
        break;
      default:
        return res.status(400).json({
          error: `Action '${action}' tidak valid. Action yang tersedia: categories, templates, generate, timestamp, artAiPresigned, artAi, artAiWithUpload, artPremiumPresigned, artPremium, artPremiumWithUpload, enhancePresigned, enhance, enhanceWithUpload, beautyPresigned, faceBeauty, bodyBeautify, faceBeautyWithUpload, clothesPresigned, clothes, clothesWithUpload, fittingPresigned, fitting, fittingWithUpload, removeBgPresigned, removeBg, removeBgWithUpload, removeObjectPresigned, removeObject, removeObjectWithUpload, segmentPresigned, segment, segmentWithUpload, restorePresigned, restore, restoreWithUpload, expandPresigned, expand, expandWithUpload, inpainting, animalFusionPresigned, animalFusion, animalFusionWithUpload, videoInfo, textToImage, downloadImage, qwenPresigned, qwen, qwenWithUpload, aiStyles, clothesList, artStyles, artPremiumStyles, animalFusionStyles, beautyStyles.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}