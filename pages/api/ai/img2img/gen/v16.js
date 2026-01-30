ubah tanpa api token.zone.id agar manual gen sesuai smali,
jika di libtk.so
ada publickey
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo+yvc35R8VPsfy1ScmQap+vVg/IYTcZCiJP5iiIo0HFLBrfDhwZ30wpvQ8lpezTN3exdZU3edIspp+weCgifbjFEyI7/Ecce7GTYXZyLncBrjzvO6IohPnaz/hx7+Uy6eNw8DNk15sxcJrQeSOULtOWJJ8dJ2IbR1eRIp0PXwJeXqdfoT52WzT/FaNzwh7sWmt4Zl8cw9o9JvdTqdU3WsCsdqsOXWIgyP/UIFWM+uu7P1xJ/DY40nMokHlG+fDdiT0us5Vu4LNUt3Er8OOZynnOESSQUocSvpb9UOcK5SurLCjWsk0RnQY2RBQluBnC9isJK
# classes.dex

.class public final La/bd/jniutils/TokenUtils;
.super Ljava/lang/Object;
.source "SourceFile"


# static fields
.field public static final a:La/bd/jniutils/TokenUtils;

.field public static final b:I

.field public static final c:Ljava/util/LinkedHashMap;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/LinkedHashMap<",
            "Ljava/lang/Long;",
            "Ljava/lang/String;",
            ">;"
        }
    .end annotation
.end field


# direct methods
.method static constructor <clinit>()V
    .registers 1

    new-instance v0, La/bd/jniutils/TokenUtils;

    invoke-direct {v0}, La/bd/jniutils/TokenUtils;-><init>()V

    sput-object v0, La/bd/jniutils/TokenUtils;->a:La/bd/jniutils/TokenUtils;

    :try_start_7
    const-string v0, "tk"

    invoke-static {v0}, Ljava/lang/System;->loadLibrary(Ljava/lang/String;)V
    :try_end_c
    .catchall {:try_start_7 .. :try_end_c} :catchall_d

    goto :goto_11

    :catchall_d
    move-exception v0

    invoke-virtual {v0}, Ljava/lang/Throwable;->printStackTrace()V

    :goto_11
    const/16 v0, 0x14

    sput v0, La/bd/jniutils/TokenUtils;->b:I

    new-instance v0, Ljava/util/LinkedHashMap;

    invoke-direct {v0}, Ljava/util/LinkedHashMap;-><init>()V

    sput-object v0, La/bd/jniutils/TokenUtils;->c:Ljava/util/LinkedHashMap;

    return-void
.end method

.method public constructor <init>()V
    .registers 1

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method

.method public static b(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
    .registers 8

    const-string v0, "getBytes(...)"

    const-string v1, "UTF_8"

    :try_start_4
    const-string v2, "AES/CBC/PKCS5Padding"

    invoke-static {v2}, Ljavax/crypto/Cipher;->getInstance(Ljava/lang/String;)Ljavax/crypto/Cipher;

    move-result-object v2

    new-instance v3, Ljavax/crypto/spec/SecretKeySpec;

    sget-object v4, Ljava/nio/charset/StandardCharsets;->UTF_8:Ljava/nio/charset/Charset;

    invoke-static {v4, v1}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    invoke-virtual {p1, v4}, Ljava/lang/String;->getBytes(Ljava/nio/charset/Charset;)[B

    move-result-object p1

    invoke-static {p1, v0}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    const-string v1, "AES"

    invoke-direct {v3, p1, v1}, Ljavax/crypto/spec/SecretKeySpec;-><init>([BLjava/lang/String;)V

    new-instance p1, Ljavax/crypto/spec/IvParameterSpec;

    invoke-virtual {p2, v4}, Ljava/lang/String;->getBytes(Ljava/nio/charset/Charset;)[B

    move-result-object p2

    invoke-static {p2, v0}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    invoke-direct {p1, p2}, Ljavax/crypto/spec/IvParameterSpec;-><init>([B)V

    const/4 p2, 0x2

    invoke-virtual {v2, p2, v3, p1}, Ljavax/crypto/Cipher;->init(ILjava/security/Key;Ljava/security/spec/AlgorithmParameterSpec;)V

    const/4 p1, 0x0

    invoke-static {p0, p1}, Landroid/util/Base64;->decode(Ljava/lang/String;I)[B

    move-result-object p0

    invoke-virtual {v2, p0}, Ljavax/crypto/Cipher;->doFinal([B)[B

    move-result-object p0

    new-instance p1, Ljava/lang/String;

    invoke-static {p0}, Lc9/k;->b(Ljava/lang/Object;)V

    sget-object p2, Lk9/a;->b:Ljava/nio/charset/Charset;

    invoke-direct {p1, p0, p2}, Ljava/lang/String;-><init>([BLjava/nio/charset/Charset;)V
    :try_end_40
    .catch Ljava/lang/Exception; {:try_start_4 .. :try_end_40} :catch_41

    return-object p1

    :catch_41
    move-exception p0

    invoke-virtual {p0}, Ljava/lang/Throwable;->printStackTrace()V

    const-string p0, ""

    return-object p0
.end method

.method public static d(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
    .registers 8

    const-string v0, "getBytes(...)"

    const-string v1, "UTF_8"

    :try_start_4
    const-string v2, "AES/CBC/PKCS5Padding"

    invoke-static {v2}, Ljavax/crypto/Cipher;->getInstance(Ljava/lang/String;)Ljavax/crypto/Cipher;

    move-result-object v2

    new-instance v3, Ljavax/crypto/spec/SecretKeySpec;

    sget-object v4, Ljava/nio/charset/StandardCharsets;->UTF_8:Ljava/nio/charset/Charset;

    invoke-static {v4, v1}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    invoke-virtual {p1, v4}, Ljava/lang/String;->getBytes(Ljava/nio/charset/Charset;)[B

    move-result-object p1

    invoke-static {p1, v0}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    const-string v1, "AES"

    invoke-direct {v3, p1, v1}, Ljavax/crypto/spec/SecretKeySpec;-><init>([BLjava/lang/String;)V

    new-instance p1, Ljavax/crypto/spec/IvParameterSpec;

    invoke-virtual {p2, v4}, Ljava/lang/String;->getBytes(Ljava/nio/charset/Charset;)[B

    move-result-object p2

    invoke-static {p2, v0}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    invoke-direct {p1, p2}, Ljavax/crypto/spec/IvParameterSpec;-><init>([B)V

    const/4 p2, 0x1

    invoke-virtual {v2, p2, v3, p1}, Ljavax/crypto/Cipher;->init(ILjava/security/Key;Ljava/security/spec/AlgorithmParameterSpec;)V

    invoke-virtual {p0, v4}, Ljava/lang/String;->getBytes(Ljava/nio/charset/Charset;)[B

    move-result-object p0

    invoke-static {p0, v0}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    invoke-virtual {v2, p0}, Ljavax/crypto/Cipher;->doFinal([B)[B

    move-result-object p0

    const/4 p1, 0x2

    invoke-static {p0, p1}, Landroid/util/Base64;->encodeToString([BI)Ljava/lang/String;

    move-result-object p0
    :try_end_3d
    .catch Ljava/lang/Exception; {:try_start_4 .. :try_end_3d} :catch_3e

    return-object p0

    :catch_3e
    move-exception p0

    invoke-virtual {p0}, Ljava/lang/Throwable;->printStackTrace()V

    const-string p0, ""

    return-object p0
.end method

.method private final native paramsToken(Ljava/lang/String;)Ljava/lang/String;
    .annotation build Landroidx/annotation/Keep;
    .end annotation
.end method

.method private final native publicKey()Ljava/lang/String;
    .annotation build Landroidx/annotation/Keep;
    .end annotation
.end method


# virtual methods
.method public final declared-synchronized a(JLjava/lang/String;)Ljava/lang/String;
    .registers 7

    monitor-enter p0

    :try_start_1
    sget-object v0, La/bd/jniutils/TokenUtils;->c:Ljava/util/LinkedHashMap;

    invoke-virtual {v0}, Ljava/util/AbstractMap;->isEmpty()Z

    move-result v1
    :try_end_7
    .catchall {:try_start_1 .. :try_end_7} :catchall_37

    const/4 v2, 0x0

    if-eqz v1, :cond_c

    monitor-exit p0

    return-object v2

    :cond_c
    :try_start_c
    invoke-static {p1, p2}, Ljava/lang/Long;->valueOf(J)Ljava/lang/Long;

    move-result-object p1

    invoke-virtual {v0, p1}, Ljava/util/LinkedHashMap;->get(Ljava/lang/Object;)Ljava/lang/Object;

    move-result-object p1

    check-cast p1, Ljava/lang/String;
    :try_end_16
    .catchall {:try_start_c .. :try_end_16} :catchall_37

    if-nez p1, :cond_1a

    monitor-exit p0

    return-object v2

    :cond_1a
    const/4 p2, 0x0

    const/16 v0, 0x10

    :try_start_1d
    invoke-virtual {p1, p2, v0}, Ljava/lang/String;->substring(II)Ljava/lang/String;

    move-result-object p2

    const-string v1, "substring(...)"

    invoke-static {p2, v1}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    const/16 v1, 0x20

    invoke-virtual {p1, v0, v1}, Ljava/lang/String;->substring(II)Ljava/lang/String;

    move-result-object p1

    const-string v0, "substring(...)"

    invoke-static {p1, v0}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    invoke-static {p3, p2, p1}, La/bd/jniutils/TokenUtils;->b(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1
    :try_end_35
    .catchall {:try_start_1d .. :try_end_35} :catchall_37

    monitor-exit p0

    return-object p1

    :catchall_37
    move-exception p1

    :try_start_38
    monitor-exit p0
    :try_end_39
    .catchall {:try_start_38 .. :try_end_39} :catchall_37

    throw p1
.end method

.method public final declared-synchronized c(Landroid/content/Context;Ljava/lang/String;)LN8/h;
    .registers 11

    monitor-enter p0

    :try_start_1
    const-string v0, "context"

    invoke-static {p1, v0}, Lc9/k;->e(Ljava/lang/Object;Ljava/lang/String;)V

    const-string v0, "data"

    invoke-static {p2, v0}, Lc9/k;->e(Ljava/lang/Object;Ljava/lang/String;)V

    invoke-static {}, Ljava/lang/System;->currentTimeMillis()J

    move-result-wide v0

    invoke-static {}, Ljava/util/UUID;->randomUUID()Ljava/util/UUID;

    move-result-object v2

    invoke-virtual {v2}, Ljava/util/UUID;->toString()Ljava/lang/String;

    move-result-object v2

    const-string v3, "toString(...)"

    invoke-static {v2, v3}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    const-string v3, "-"

    const-string v4, ""

    invoke-static {v2, v3, v4}, Lk9/m;->s(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object v2

    sget-object v3, La/bd/jniutils/TokenUtils;->c:Ljava/util/LinkedHashMap;

    invoke-virtual {v3}, Ljava/util/AbstractMap;->size()I

    move-result v4

    sget v5, La/bd/jniutils/TokenUtils;->b:I

    const/4 v6, 0x1

    sub-int/2addr v5, v6

    if-le v4, v5, :cond_47

    invoke-virtual {v3}, Ljava/util/LinkedHashMap;->keySet()Ljava/util/Set;

    move-result-object v4

    const-string v5, "<get-keys>(...)"

    invoke-static {v4, v5}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    invoke-static {v4}, LO8/r;->E(Ljava/util/Set;)Ljava/lang/Object;

    move-result-object v4

    check-cast v4, Ljava/lang/Long;

    if-eqz v4, :cond_47

    invoke-virtual {v3, v4}, Ljava/util/AbstractMap;->remove(Ljava/lang/Object;)Ljava/lang/Object;

    goto :goto_47

    :catchall_45
    move-exception p1

    goto :goto_9e

    :cond_47
    :goto_47
    invoke-static {v0, v1}, Ljava/lang/Long;->valueOf(J)Ljava/lang/Long;

    move-result-object v4

    invoke-interface {v3, v4, v2}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    new-instance v3, Lorg/json/JSONObject;

    invoke-direct {v3}, Lorg/json/JSONObject;-><init>()V

    const-string v4, "rv"

    invoke-virtual {v3, v4, v6}, Lorg/json/JSONObject;->put(Ljava/lang/String;I)Lorg/json/JSONObject;

    const-string v4, "ki"

    invoke-virtual {p0, p1, v2}, La/bd/jniutils/TokenUtils;->e(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1
    :try_end_5e
    .catchall {:try_start_1 .. :try_end_5e} :catchall_45

    const/4 v5, 0x0

    if-nez p1, :cond_63

    monitor-exit p0

    return-object v5

    :cond_63
    :try_start_63
    invoke-virtual {v3, v4, p1}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    const-string p1, "data"

    const/4 v4, 0x0

    const/16 v6, 0x10

    invoke-virtual {v2, v4, v6}, Ljava/lang/String;->substring(II)Ljava/lang/String;

    move-result-object v4

    const-string v7, "substring(...)"

    invoke-static {v4, v7}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    const/16 v7, 0x20

    invoke-virtual {v2, v6, v7}, Ljava/lang/String;->substring(II)Ljava/lang/String;

    move-result-object v2

    const-string v6, "substring(...)"

    invoke-static {v2, v6}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    invoke-static {p2, v4, v2}, La/bd/jniutils/TokenUtils;->d(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;

    move-result-object p2
    :try_end_83
    .catchall {:try_start_63 .. :try_end_83} :catchall_45

    if-nez p2, :cond_87

    monitor-exit p0

    return-object v5

    :cond_87
    :try_start_87
    invoke-virtual {v3, p1, p2}, Lorg/json/JSONObject;->put(Ljava/lang/String;Ljava/lang/Object;)Lorg/json/JSONObject;

    new-instance p1, LN8/h;

    invoke-virtual {v3}, Lorg/json/JSONObject;->toString()Ljava/lang/String;

    move-result-object p2

    const-string v2, "toString(...)"

    invoke-static {p2, v2}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    invoke-static {v0, v1}, Ljava/lang/Long;->valueOf(J)Ljava/lang/Long;

    move-result-object v0

    invoke-direct {p1, p2, v0}, LN8/h;-><init>(Ljava/lang/Object;Ljava/lang/Object;)V
    :try_end_9c
    .catchall {:try_start_87 .. :try_end_9c} :catchall_45

    monitor-exit p0

    return-object p1

    :goto_9e
    :try_start_9e
    monitor-exit p0
    :try_end_9f
    .catchall {:try_start_9e .. :try_end_9f} :catchall_45

    throw p1
.end method

.method public final e(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;
    .registers 7

    :try_start_0
    invoke-direct {p0}, La/bd/jniutils/TokenUtils;->publicKey()Ljava/lang/String;

    move-result-object p1
    :try_end_4
    .catch Ljava/lang/UnsatisfiedLinkError; {:try_start_0 .. :try_end_4} :catch_5

    goto :goto_1e

    :catch_5
    new-instance v0, LX2/b;

    invoke-direct {v0}, LX2/b;-><init>()V

    if-eqz p1, :cond_79

    const-string v1, "Beginning load of %s..."

    const-string v2, "tk"

    filled-new-array {v2}, [Ljava/lang/Object;

    move-result-object v3

    invoke-static {v1, v3}, LX2/b;->d(Ljava/lang/String;[Ljava/lang/Object;)V

    invoke-virtual {v0, p1, v2}, LX2/b;->b(Landroid/content/Context;Ljava/lang/String;)V

    invoke-direct {p0}, La/bd/jniutils/TokenUtils;->publicKey()Ljava/lang/String;

    move-result-object p1

    :goto_1e
    const/4 v0, 0x0

    const/4 v1, 0x2

    if-eqz p1, :cond_57

    invoke-virtual {p1}, Ljava/lang/String;->length()I

    move-result v2

    if-nez v2, :cond_29

    goto :goto_57

    :cond_29
    const-string v2, "\\s+"

    invoke-static {v2}, Ljava/util/regex/Pattern;->compile(Ljava/lang/String;)Ljava/util/regex/Pattern;

    move-result-object v2

    const-string v3, "compile(...)"

    invoke-static {v2, v3}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    const-string v3, ""

    invoke-virtual {v2, p1}, Ljava/util/regex/Pattern;->matcher(Ljava/lang/CharSequence;)Ljava/util/regex/Matcher;

    move-result-object p1

    invoke-virtual {p1, v3}, Ljava/util/regex/Matcher;->replaceAll(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1

    const-string v2, "replaceAll(...)"

    invoke-static {p1, v2}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    invoke-static {p1, v1}, Landroid/util/Base64;->decode(Ljava/lang/String;I)[B

    move-result-object p1

    new-instance v2, Ljava/security/spec/X509EncodedKeySpec;

    invoke-direct {v2, p1}, Ljava/security/spec/X509EncodedKeySpec;-><init>([B)V

    const-string p1, "RSA"

    invoke-static {p1}, Ljava/security/KeyFactory;->getInstance(Ljava/lang/String;)Ljava/security/KeyFactory;

    move-result-object p1

    invoke-virtual {p1, v2}, Ljava/security/KeyFactory;->generatePublic(Ljava/security/spec/KeySpec;)Ljava/security/PublicKey;

    move-result-object p1

    goto :goto_58

    :cond_57
    :goto_57
    move-object p1, v0

    :goto_58
    if-nez p1, :cond_5b

    return-object v0

    :cond_5b
    const-string v0, "RSA/ECB/PKCS1Padding"

    invoke-static {v0}, Ljavax/crypto/Cipher;->getInstance(Ljava/lang/String;)Ljavax/crypto/Cipher;

    move-result-object v0

    const/4 v2, 0x1

    invoke-virtual {v0, v2, p1}, Ljavax/crypto/Cipher;->init(ILjava/security/Key;)V

    sget-object p1, Lk9/a;->b:Ljava/nio/charset/Charset;

    invoke-virtual {p2, p1}, Ljava/lang/String;->getBytes(Ljava/nio/charset/Charset;)[B

    move-result-object p1

    const-string p2, "getBytes(...)"

    invoke-static {p1, p2}, Lc9/k;->d(Ljava/lang/Object;Ljava/lang/String;)V

    invoke-virtual {v0, p1}, Ljavax/crypto/Cipher;->doFinal([B)[B

    move-result-object p1

    invoke-static {p1, v1}, Landroid/util/Base64;->encodeToString([BI)Ljava/lang/String;

    move-result-object p1

    return-object p1

    :cond_79
    new-instance p1, Ljava/lang/IllegalArgumentException;

    const-string p2, "Given context is null"

    invoke-direct {p1, p2}, Ljava/lang/IllegalArgumentException;-><init>(Ljava/lang/String;)V

    throw p1
.end method

.method public final f(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;
    .registers 7

    const-string v0, "context"

    invoke-static {p1, v0}, Lc9/k;->e(Ljava/lang/Object;Ljava/lang/String;)V

    :try_start_5
    invoke-direct {p0, p2}, La/bd/jniutils/TokenUtils;->paramsToken(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1
    :try_end_9
    .catch Ljava/lang/UnsatisfiedLinkError; {:try_start_5 .. :try_end_9} :catch_a

    return-object p1

    :catch_a
    new-instance v0, LX2/b;

    invoke-direct {v0}, LX2/b;-><init>()V

    const-string v1, "Beginning load of %s..."

    const-string v2, "tk"

    filled-new-array {v2}, [Ljava/lang/Object;

    move-result-object v3

    invoke-static {v1, v3}, LX2/b;->d(Ljava/lang/String;[Ljava/lang/Object;)V

    invoke-virtual {v0, p1, v2}, LX2/b;->b(Landroid/content/Context;Ljava/lang/String;)V

    invoke-direct {p0, p2}, La/bd/jniutils/TokenUtils;->paramsToken(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p1

    return-object p1
.end method

import axios from "axios";
class MorphAI {
  constructor() {
    this.bu = "https://storage.googleapis.com/hardstone_img_us/";
    this.validStyles = null;
    this.styleArray = ["2dCartoon", "3D", "3d", "3d", "3d", "80sCartoon", "80sCartoon", "90s", "90s", "90sanime", "90sanime", "Abyssia", "Afro", "Alita", "Alita", "AmeriDraw", "Ancient", "Angel", "Animation", "Ares", "Ares", "Art Studio", "Aurelia", "Autumn", "Bald", "Barber Shop", "Baroque", "Baroque", "BdayPop", "Bedroom", "Black Eye", "BleachFX", "BlindBox Dog", "BlindBox Girl", "BlindBox Lady", "BlindBox Man", "BlindBox Pets", "BlindBox Skateboard", "BlindBox", "Bling", "Blue Moment", "Blushday", "Blushday", "Bob", "Burgundy", "Butterfly", "Camellia 1", "Camellia 2", "CarRace", "Carnival Night", "Cheerleader", "Cheerleader", "Chefie", "Cheongsam", "Cheongsam", "Cherry", "Cherry", "Chic Blouse", "Childlike", "Classy White", "Clay", "Clay2", "ClayFP", "Clipart", "Combover", "Contour", "Contour", "Coralia", "Coser", "Cozy Sweater", "Cozy SweaterMale", "Crayon", "Crayon", "Crimsia", "Crystal", "Crystal", "CubeCraft", "Curly", "DaisyMe", "Dark Trench", "Dark Trench", "Daznee", "Digital", "Dominant", "Dominant", "Dominant", "Doodle", "Dreadlocks", "Easter", "Elite 1", "Elite 1", "Elite 2", "Elite 2", "Fairy Tale", "Family Portrait", "FauxHawk", "FitBuddy", "Flower Light", "Formal Shirt", "French Sketch", "FrizzyCurls", "Fuji Flash", "Fuji", "Fur Coat", "FuzzyPop", "Gangsta", "Ghiblipro", "Ghost", "Ghosti", "Gianty", "Gianty", "Glacelle", "Goalstar", "Golden Hour", "Group_Shot", "Group_Shot", "Group_Shot", "Halloween Me", "Halloween Model", "Halloween", "HalloweenMale", "HandDrawn", "Harley Pigtails", "Heroic", "HomeDude", "Hoopstar", "Hotlove", "Hotlove", "Ivory", "Ivory", "JOJO", "Jade", "Jersey", "Jersey", "KPop Hunter Male", "KPop Hunter", "KTV", "Kawaii", "KeyChain", "Kimono", "Lafufu", "Leopard Hot", "Leopard Hot", "Leopard", "Leopard", "LifeSim", "Loong Ball", "LooseCurls", "LostFocus", "Lulu Girl", "Lulu Girl", "Lunaria", "Magazine 1", "Magazine 2", "Magazine 3", "Magic Ball", "MagicPill", "Marry Me", "Marry Me", "Mermaid", "Mermaid", "Midnight Call 1", "Midnight Call 2", "Midnight Call 3", "Midnight Call 4", "Mini Me", "Minifig", "Miss Hawaii", "Miss Hawaii", "Mistoire", "Miyazaki", "Miyazaki", "Model Anime", "Model Cat", "Model Dog", "Model Man", "Model Sports", "Model Woman", "Moment", "MonoLine", "Moon Sailor", "Mr Hawaii", "Mr Hawaii", "Muppet", "Mystic Serenity", "Mythia", "Nagomi", "Navy Blue", "NeoDora", "Nightfire", "Nightfire", "Ninjafix", "Noble Gray", "Noel Star", "Noel StarMale", "Oil Painting", "Oil Recoco", "Oil Recoco", "Papillon", "Peanutz", "Pearlith", "Pencil Sketch", "Pet Me", "Pet Me", "Petals", "Phantom", "Phantom", "Picture Book", "Pilot", "Pilot", "PirateFemale", "PirateFemale", "PirateMale", "PirateMale", "Pixar", "Pixar", "Pixel Me", "Pixel Week", "Pixels", "Pizza Horror", "Plaid", "Plaid", "Plaid", "Plant Tone", "PopStar", "Poster Chic", "Power Retro", "Power Retro", "Pregnant", "PregnantMale", "Preppy", "Preppy", "Prince Grace", "Princess Aura", "Pro Shot", "ProHeadshot", "Pumpkin Elf", "Pure Glow", "Pure Glow", "Retro Gaze", "Retro Gaze", "Retro Style", "Retro Style", "Retro Toon", "Rubber Hose", "Sailor", "Santa Red", "Santa RedMale", "Selfie", "Sharkie", "SharkiePet", "ShinFun", "Sketch", "SkiRush", "Skims", "Skims", "Slam Dunk", "Slam Dunk", "Slayer", "Smart", "Smart", "Snoworb", "Snoworb", "Soft Luxe", "Soft Luxe", "Solmare", "Spongee", "Squid Game", "Squid Soldier", "Steampunk", "Steampunk", "Sticklet", "Sticklet", "Straight", "Sunrise 1", "Sunrise 1", "Sunrise 2", "Sunset 1", "Sunset 1", "Sunset 2", "Super Bowl", "Super Bowl", "SuperBowl", "Sylmare", "Tanned", "Tanned", "Tattoo", "Tennis Ace", "Tomboy", "ToonMe", "Toy Me", "Toy Me", "Trick or Treat", "Twintails", "Van Gogh", "Victoria", "VolleyPro", "Wavy", "WebComicFemale", "WebComicMale", "Woodli", "Workee", "Y2K Miss", "Y2K", "Yellowtopia", "YellowtopiaMale", "Zelshade", "animation", "bambi", "barbie", "beach", "beach", "bikini", "bluelover", "bubble", "business", "business", "business", "chibi", "climb", "climb", "comic", "cyber", "darkness", "darkness", "dazzling", "delighted", "detective", "devil", "dragon", "egyptian", "egyptian", "eighty", "elegant", "elegant", "elf", "exotic", "exotic", "fairy", "fairy", "fellow", "fellow", "firework", "firework", "floral", "future", "galaxy", "ghost", "ginger", "ginger", "gogirl", "gothic", "hanfu", "hanfu", "hero", "iOS Emoji", "illustration", "ink", "iron", "iron", "japanese", "jojo", "joyful", "joyful", "king", "king", "korean", "lego", "lightbulb", "linkedlnlady", "linkedlnlady", "luxe", "luxe", "me", "me", "me", "merry", "merry", "modern", "molly_emoji", "monster", "muscular_body", "muscular_body", "nutcracker", "nutcracker", "orange", "pandora", "paper", "pink", "pink", "pinkeyes", "pirate", "pop", "pumpkin", "pureromance", "queen", "queen", "queen", "queen", "rainbow", "rick", "rococo", "rococo", "rosepetals", "rosy", "rosy", "sakura", "santa", "secret", "sitcom", "sitcom", "snowy", "soft", "soft", "spirit", "spooky", "spooky", "sporting", "sporting", "spring", "springprincess", "springprincess", "story", "tomie", "tour", "tour", "tour", "uniform", "uniform", "vibrant", "vogue", "vogue", "war", "watercolor", "wedding", "wedding", "wizard", "wizard", "wizard", "wool", "xmaseve", "youth"];
  }
  log(msg, data = null) {
    console.log(`[MORPH] ${msg}`, data ?? "");
  }
  err(msg, e) {
    console.error(`[MORPH ERR] ${msg}`, e?.response?.data || e?.response || e?.message || e);
  }
  async up(buf, fn) {
    this.log("up: init", fn);
    const sz = buf.length;
    const iu = `https://firebasestorage.googleapis.com/v0/b/hardstone_img_us/o?name=snap_img2img/upload/2025-07-14/${fn}&uploadType=resumable`;
    const ih = {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 10; SM-G9650 Build/QD4A.200805.003)",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
      "X-Firebase-Storage-Version": "Android/25.13.33 (100400-745790146)",
      "x-firebase-gmpid": "1:890704113682:android:4fe6bc1e015020503a28cb",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Header-Content-Type": "application/octet-stream",
      "Content-Length": "0"
    };
    try {
      const ir = await axios.post(iu, null, {
        headers: ih
      });
      this.log("up: init res", {
        uploadUrl: ir.headers["x-goog-upload-url"]?.slice(0, 60) + "..."
      });
      const uu = ir.headers["x-goog-upload-url"];
      if (!uu) throw new Error("no upload url");
      const uh = {
        "Content-Type": "application/octet-stream",
        "X-Goog-Upload-Command": "upload, finalize",
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Protocol": "resumable",
        "Content-Length": sz.toString()
      };
      const ur = await axios.post(uu, buf, {
        headers: uh
      });
      this.log("up: final res", ur.data);
      const tk = ur.data?.downloadTokens;
      if (!tk) throw new Error("no downloadTokens in upload response");
      this.log("up: done", {
        fn: fn,
        tk: tk
      });
      return {
        fn: fn,
        tk: tk
      };
    } catch (e) {
      this.err("up failed", e);
      throw e;
    }
  }
  async tk() {
    this.log("tk: fetch");
    try {
      const r = await axios.get("https://token.zone.id/frida-hook/a/bd/jniutils/TokenUtils");
      this.log("tk: res", {
        uid: r.data.uid
      });
      if (!r.data?.uid || !r.data?.token) throw new Error("invalid token");
      return {
        uid: r.data.uid,
        token: r.data.token
      };
    } catch (e) {
      this.err("tk failed", e);
      throw e;
    }
  }
  async hdl(img) {
    if (Buffer.isBuffer(img)) {
      this.log("hdl: buffer", {
        size: img.length
      });
      return img;
    }
    if (typeof img === "string" && img.startsWith("http")) {
      this.log("hdl: fetch url", img);
      const r = await axios.get(img, {
        responseType: "arraybuffer"
      });
      this.log("hdl: downloaded", {
        size: r.data.byteLength
      });
      return Buffer.from(r.data);
    }
    if (typeof img === "string" && img.startsWith("data:")) {
      this.log("hdl: base64");
      const b64 = img.split(",")[1] ?? "";
      return Buffer.from(b64, "base64");
    }
    throw new Error("invalid image input");
  }
  getValidStyles() {
    if (this.validStyles) return this.validStyles;
    this.log("styles: using hardcoded array");
    this.validStyles = this.styleArray.map(s => ({
      id: s,
      name: s
    }));
    return this.validStyles;
  }
  resolveStyle(styleInput) {
    const styleNum = parseInt(styleInput);
    if (!isNaN(styleNum) && styleNum >= 1 && styleNum <= this.styleArray.length) {
      const styleName = this.styleArray[styleNum - 1];
      this.log(`style: resolved ${styleNum} → ${styleName}`);
      return styleName;
    }
    if (typeof styleInput === "string" && this.styleArray.includes(styleInput)) {
      this.log(`style: using ${styleInput}`);
      return styleInput;
    }
    const defaultStyle = this.styleArray[0];
    this.log(`style: invalid ${styleInput} → using default ${defaultStyle}`);
    return defaultStyle;
  }
  async generate({
    pro_t = "",
    imageUrl,
    style = null,
    ...rest
  }) {
    this.log("gen: start", {
      pro_t: !!pro_t,
      image: !!imageUrl,
      style: style
    });
    try {
      if (!imageUrl) throw new Error("imageUrl required");
      const buf = await this.hdl(imageUrl);
      const fn = `img_${Date.now()}.jpg`;
      const {
        fn: ufn,
        tk: ftk
      } = await this.up(buf, fn);
      const {
        uid,
        token
      } = await this.tk();
      if (!ftk) throw new Error("no file token");
      const validStyle = style ? this.resolveStyle(style) : this.styleArray[0];
      const pl = {
        image_name: `snap_img2img/upload/2025-07-14/${fn}`,
        pro_t: pro_t,
        style_id: validStyle,
        strength: 50,
        bs: "4",
        ratio: 1,
        is_first: "1",
        gender: "auto",
        ...rest
      };
      this.log("gen: submit payload", pl);
      await new Promise(r => setTimeout(r, 2e3));
      const headers = {
        "User-Agent": "okhttp/4.12.0",
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip",
        uid: uid,
        token: token
      };
      const r = await axios.post("https://ai.hardstonepte.ltd/snap/img2img/", pl, {
        headers: headers
      });
      this.log("gen: submit res", r.data);
      const responseData = r?.data;
      if (responseData?.response === "ok") {
        const imageUrlArray = responseData?.data?.image_url ?? responseData?.image_url;
        if (Array.isArray(imageUrlArray)) {
          const imageUrls = imageUrlArray.map(relativePath => this.bu + relativePath);
          this.log("gen: success", imageUrls);
          return {
            success: true,
            data: {
              images: imageUrls,
              taskId: responseData?.data?.task_id ?? responseData?.task_id,
              count: imageUrls.length,
              usedStyle: validStyle
            }
          };
        }
      }
      const errMsg = responseData?.message || responseData?.error || "submit failed";
      throw new Error(errMsg);
    } catch (e) {
      this.err("gen failed", e);
      return {
        success: false,
        error: e?.message || "unknown error",
        details: e?.response?.data
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    imageUrl,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!imageUrl) {
    return res.status(400).json({
      error: "Input 'imageUrl' wajib diisi."
    });
  }
  try {
    const api = new MorphAI();
    const response = await api.generate({
      imageUrl: imageUrl,
      ...params
    });
    return res.status(200).json(response);
  } catch (error) {
    console.error("Terjadi kesalahan pada API:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}