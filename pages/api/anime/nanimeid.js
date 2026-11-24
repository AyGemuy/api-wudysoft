import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";

const ROUTES = {
  // === AUTH & SESSION ===
  get_app_collection_screen: { method: "GET", path: "/app/collection-screen" },
  get_app_home_screen: { method: "GET", path: "/app/home-screen" },
  get_app_nanistore_screen: { method: "GET", path: "/app/nanistore-screen" },
  get_app_profile_screen: { method: "GET", path: "/app/profile-screen" },
  get_app_profile_settings_screen: { method: "GET", path: "/app/profile-settings-screen" },
  get_app_splash_screen: { method: "GET", path: "/app/splash-screen" },
  post_auth_google_bind: { method: "POST", path: "/auth/google/bind" },
  post_auth_google_unbind: { method: "POST", path: "/auth/google/unbind" },
  post_auth_google_verify: { method: "POST", path: "/auth/google/verify", authMode: "login" },
  post_auth_logout: { method: "POST", path: "/auth/logout", authMode: "logout" },
  post_auth_refresh_token: { method: "POST", path: "/auth/refresh-token", authMode: "refresh" },
  get_profile_me: { method: "GET", path: "/profile/me" },
  put_profile_me: { method: "PUT", path: "/profile/me" },
  put_profile_me_avatar: { method: "PUT", path: "/profile/me/avatar" },
  put_profile_me_banner: { method: "PUT", path: "/profile/me/banner" },
  get_profile_me_birthdate_status: { method: "GET", path: "/profile/me/birthdate-status" },
  get_profile_me_collection_points: { method: "GET", path: "/profile/me/collection-points" },
  get_profile_me_google_bound: { method: "GET", path: "/profile/me/google-bound" },
  put_profile_me_offline: { method: "PUT", path: "/profile/me/offline" },
  put_profile_me_online: { method: "PUT", path: "/profile/me/online" },
  get_profile_me_watched_anime: { method: "GET", path: "/profile/me/watched-anime" },
  post_profile_me_watched_anime_sync: { method: "POST", path: "/profile/me/watched-anime/sync" },
  get_settings: { method: "GET", path: "/settings" },
  get_settings_features_by_feature: { method: "GET", path: "/settings/features/{feature}" },
  get_sign_in_streak: { method: "GET", path: "/sign-in-streak" },

  // === ANIME ===
  get_anime: { method: "GET", path: "/anime" },
  post_anime_requests: { method: "POST", path: "/anime-requests" },
  get_anime_requests_me: { method: "GET", path: "/anime-requests/me" },
  get_anime_requests_me_quota: { method: "GET", path: "/anime-requests/me/quota" },
  get_anime_by_anime_id: { method: "GET", path: "/anime/{anime_id}" },
  get_anime_a_z: { method: "GET", path: "/anime/a-z" },
  get_anime_catalog: { method: "GET", path: "/anime/catalog" },
  get_anime_genre_by_genre: { method: "GET", path: "/anime/genre/{genre}" },
  get_anime_genres: { method: "GET", path: "/anime/genres" },
  get_anime_latest: { method: "GET", path: "/anime/latest" },
  get_anime_live_search: { method: "GET", path: "/anime/live-search" },
  get_anime_popular_donghua: { method: "GET", path: "/anime/popular/donghua" },
  get_anime_recommendations: { method: "GET", path: "/anime/recommendations" },
  get_anime_related_by_alias: { method: "GET", path: "/anime/related-by-alias" },
  get_anime_schedule: { method: "GET", path: "/anime/schedule" },
  delete_anime_search_history: { method: "DELETE", path: "/anime/search-history" },
  get_anime_search_history: { method: "GET", path: "/anime/search-history" },
  post_anime_search_history: { method: "POST", path: "/anime/search-history" },
  delete_anime_search_history_by_history_id: { method: "DELETE", path: "/anime/search-history/{history_id}" },
  get_anime_search_history_by_history_id: { method: "GET", path: "/anime/search-history/{history_id}" },
  get_anime_search_paginated: { method: "GET", path: "/anime/search-paginated" },
  get_anime_view: { method: "GET", path: "/anime/view" },
  get_announcement_get: { method: "GET", path: "/announcement/get" },
  get_episode_video_issues_reasons: { method: "GET", path: "/episode-video-issues/reasons" },
  post_episode_video_issues_reports: { method: "POST", path: "/episode-video-issues/reports" },
  get_episode_video_issues_reports_me: { method: "GET", path: "/episode-video-issues/reports/me" },
  get_episode_anime_by_anime_id: { method: "GET", path: "/episode/anime/{anime_id}" },
  get_episode_anime_by_anime_id_episode_by_episode_id: { method: "GET", path: "/episode/anime/{anime_id}/episode/{episode_id}" },
  get_episode_download_episode_by_episode_id: { method: "GET", path: "/episode/download/episode/{episode_id}" },
  get_episode_user_progress: { method: "GET", path: "/episode/user/progress" },
  delete_episode_user_progress_anime_by_anime_id: { method: "DELETE", path: "/episode/user/progress/anime/{anime_id}" },
  get_episode_user_progress_anime_by_anime_id: { method: "GET", path: "/episode/user/progress/anime/{anime_id}" },
  get_episode_by_episode_id: { method: "GET", path: "/episode/{episode_id}" },
  post_episode_by_episode_id_duration_sync: { method: "POST", path: "/episode/{episode_id}/duration-sync" },
  get_episode_by_episode_id_next: { method: "GET", path: "/episode/{episode_id}/next" },
  get_episode_by_episode_id_progress: { method: "GET", path: "/episode/{episode_id}/progress" },
  post_episode_by_episode_id_progress: { method: "POST", path: "/episode/{episode_id}/progress" },
  get_related: { method: "GET", path: "/related" },
  get_related_episodes: { method: "GET", path: "/related/episodes" },

  // === MANGA ===
  get_chapters_by_chapter_id: { method: "GET", path: "/chapters/{chapter_id}" },
  get_manga_chapter_updates: { method: "GET", path: "/manga/chapter-updates" },
  get_manga_download: { method: "GET", path: "/manga/download" },
  delete_manga_favorites: { method: "DELETE", path: "/manga/favorites" },
  get_manga_favorites: { method: "GET", path: "/manga/favorites" },
  post_manga_favorites: { method: "POST", path: "/manga/favorites" },
  get_manga_genres: { method: "GET", path: "/manga/genres" },
  get_manga_list: { method: "GET", path: "/manga/list" },
  get_manga_popular: { method: "GET", path: "/manga/popular" },
  delete_manga_progress: { method: "DELETE", path: "/manga/progress" },
  get_manga_progress: { method: "GET", path: "/manga/progress" },
  post_manga_progress: { method: "POST", path: "/manga/progress" },
  get_manga_progress_list: { method: "GET", path: "/manga/progress/list" },
  get_manga_progress_by_manga_id_chapters_by_chapter_id: { method: "GET", path: "/manga/progress/{manga_id}/chapters/{chapter_id}" },
  get_manga_search: { method: "GET", path: "/manga/search" },
  get_manga_by_manga_id: { method: "GET", path: "/manga/{manga_id}" },
  get_manga_by_manga_id_chapters_by_chapter_id_comments: { method: "GET", path: "/manga/{manga_id}/chapters/{chapter_id}/comments" },
  post_manga_by_manga_id_chapters_by_chapter_id_comments: { method: "POST", path: "/manga/{manga_id}/chapters/{chapter_id}/comments" },
  get_manga_by_manga_id_chapters_by_chapter_id_download_token: { method: "GET", path: "/manga/{manga_id}/chapters/{chapter_id}/download-token" },
  post_manga_by_manga_id_chapters_by_chapter_id_progress_xp: { method: "POST", path: "/manga/{manga_id}/chapters/{chapter_id}/progress/xp" },

  // === FAVORITE & KOLEKSI ===
  delete_favorite: { method: "DELETE", path: "/favorite" },
  get_favorite_status: { method: "GET", path: "/favorite/status" },
  get_favorites_anime: { method: "GET", path: "/favorites/anime" },
  get_favorites_anime_by_anime_id: { method: "GET", path: "/favorites/anime/{anime_id}" },
  delete_favorites_anime_by_anime_id_favorite: { method: "DELETE", path: "/favorites/anime/{anime_id}/favorite" },
  get_favorites_anime_by_anime_id_favorite_status: { method: "GET", path: "/favorites/anime/{anime_id}/favorite/status" },
  get_favorites_anime_by_anime_id_lists: { method: "GET", path: "/favorites/anime/{anime_id}/lists" },
  get_favorites_lists: { method: "GET", path: "/favorites/lists" },
  post_favorites_lists: { method: "POST", path: "/favorites/lists" },
  delete_favorites_lists_by_list_id: { method: "DELETE", path: "/favorites/lists/{list_id}" },
  get_favorites_lists_by_list_id: { method: "GET", path: "/favorites/lists/{list_id}" },
  delete_favorites_lists_by_list_id_anime_by_anime_id: { method: "DELETE", path: "/favorites/lists/{list_id}/anime/{anime_id}" },
  post_favorites_lists_by_list_id_anime_by_anime_id: { method: "POST", path: "/favorites/lists/{list_id}/anime/{anime_id}" },
  get_favorites_me_favorites_anime: { method: "GET", path: "/favorites/me/favorites/anime" },
  get_lists: { method: "GET", path: "/lists" },

  // === PROGRESS & XP ===
  post_offline_watch_sync: { method: "POST", path: "/offline-watch/sync" },
  post_progress_xp: { method: "POST", path: "/progress/xp" },
  post_watch_session_acknowledge: { method: "POST", path: "/watch-session/acknowledge" },
  post_watch_session_close: { method: "POST", path: "/watch-session/close" },
  post_watch_session_create: { method: "POST", path: "/watch-session/create" },
  get_watch_session_pending_check: { method: "GET", path: "/watch-session/pending-check" },
  get_watch_session_reward_status_by_session_id: { method: "GET", path: "/watch-session/reward-status/{session_id}" },
  post_watch_session_tick: { method: "POST", path: "/watch-session/tick" },
  get_xp_history: { method: "GET", path: "/xp/history" },
  get_xp_levels: { method: "GET", path: "/xp/levels" },
  post_xp_levels_by_level_claim_all: { method: "POST", path: "/xp/levels/{level}/claim-all" },
  get_xp_me: { method: "GET", path: "/xp/me" },
  post_xp_rewards_by_reward_id_claim: { method: "POST", path: "/xp/rewards/{reward_id}/claim" },

  // === KOMENTAR & INTERAKSI ===
  get_affection: { method: "GET", path: "/affection" },
  get_affinities: { method: "GET", path: "/affinities" },
  get_comments: { method: "GET", path: "/comments" },
  post_comments: { method: "POST", path: "/comments" },
  get_comments_by_comment_id: { method: "GET", path: "/comments/{comment_id}" },
  get_comments_sse_stream: { method: "GET", path: "/comments/sse/stream", sse: true },
  delete_comments_stickers_custom_by_sticker_id: { method: "DELETE", path: "/comments/stickers/custom/{sticker_id}" },
  get_comments_stickers_me: { method: "GET", path: "/comments/stickers/me" },
  get_comments_top_latest: { method: "GET", path: "/comments/top-latest" },
  delete_comments_by_comment_id: { method: "DELETE", path: "/comments/{comment_id}" },
  put_comments_by_comment_id: { method: "PUT", path: "/comments/{comment_id}" },
  delete_comments_by_comment_id_like: { method: "DELETE", path: "/comments/{comment_id}/like" },
  post_comments_by_comment_id_like: { method: "POST", path: "/comments/{comment_id}/like" },
  get_comments_by_comment_id_replies: { method: "GET", path: "/comments/{comment_id}/replies" },
  post_comments_by_comment_id_replies: { method: "POST", path: "/comments/{comment_id}/replies" },
  delete_follow: { method: "DELETE", path: "/follow" },
  post_follow: { method: "POST", path: "/follow" },
  get_followers: { method: "GET", path: "/followers" },
  get_following: { method: "GET", path: "/following" },
  get_profile_collection_points_leaderboard: { method: "GET", path: "/profile/collection-points/leaderboard" },
  get_profile_search: { method: "GET", path: "/profile/search" },
  get_profile_by_user_id: { method: "GET", path: "/profile/{user_id}" },
  get_profile_by_user_id_comments: { method: "GET", path: "/profile/{user_id}/comments" },
  get_profile_by_user_id_favorites_anime: { method: "GET", path: "/profile/{user_id}/favorites/anime" },
  get_profile_by_user_id_recent_watched: { method: "GET", path: "/profile/{user_id}/recent-watched" },
  get_replies: { method: "GET", path: "/replies" },
  post_replies: { method: "POST", path: "/replies" },
  get_user_affinities: { method: "GET", path: "/user/affinities" },
  post_user_affinities: { method: "POST", path: "/user/affinities" },
  get_user_affinities_pending_count: { method: "GET", path: "/user/affinities/pending-count" },
  get_user_affinities_slots: { method: "GET", path: "/user/affinities/slots" },
  post_user_affinities_slots_unlock: { method: "POST", path: "/user/affinities/slots/unlock" },
  delete_user_affinities_by_affinity_id: { method: "DELETE", path: "/user/affinities/{affinity_id}" },
  get_users_by_user_id: { method: "GET", path: "/users/{user_id}" },
  get_users_friends: { method: "GET", path: "/users/friends" },
  get_users_by_user_id_affinities: { method: "GET", path: "/users/{user_id}/affinities" },
  delete_users_by_user_id_follow: { method: "DELETE", path: "/users/{user_id}/follow" },
  post_users_by_user_id_follow: { method: "POST", path: "/users/{user_id}/follow" },
  get_users_by_user_id_followers: { method: "GET", path: "/users/{user_id}/followers" },
  get_users_by_user_id_following: { method: "GET", path: "/users/{user_id}/following" },
  post_users_by_user_id_report: { method: "POST", path: "/users/{user_id}/report" },

  // === CHAT & WATCHPARTY ===
  post_chat_bubble_deactivate: { method: "POST", path: "/chat-bubble/deactivate" },
  get_chat_bubble_me: { method: "GET", path: "/chat-bubble/me" },
  post_chat_bubble_save: { method: "POST", path: "/chat-bubble/save" },
  post_chat_bubble_upload_image: { method: "POST", path: "/chat-bubble/upload-image" },
  get_chat_bubble_user_by_id: { method: "GET", path: "/chat-bubble/user/{id}" },
  post_chat_notif_seen: { method: "POST", path: "/chat-notif/seen" },
  get_chat_notif_sse_stream: { method: "GET", path: "/chat-notif/sse/stream", sse: true },
  get_chat_notif_unread_count: { method: "GET", path: "/chat-notif/unread-count" },
  get_clan_chat_sse_by_clan_id: { method: "GET", path: "/clan-chat/sse/{clan_id}", sse: true },
  get_clan_chat_by_clan_id_messages: { method: "GET", path: "/clan-chat/{clan_id}/messages" },
  post_clan_chat_by_clan_id_messages: { method: "POST", path: "/clan-chat/{clan_id}/messages" },
  delete_clan_chat_by_clan_id_messages_by_message_id: { method: "DELETE", path: "/clan-chat/{clan_id}/messages/{message_id}" },
  patch_clan_chat_by_clan_id_messages_by_message_id: { method: "PATCH", path: "/clan-chat/{clan_id}/messages/{message_id}" },
  post_clan_chat_by_clan_id_messages_by_message_id_report: { method: "POST", path: "/clan-chat/{clan_id}/messages/{message_id}/report" },
  delete_clan_chat_by_clan_id_speaking: { method: "DELETE", path: "/clan-chat/{clan_id}/speaking" },
  post_clan_chat_by_clan_id_speaking: { method: "POST", path: "/clan-chat/{clan_id}/speaking" },
  delete_clan_chat_by_clan_id_typing: { method: "DELETE", path: "/clan-chat/{clan_id}/typing" },
  post_clan_chat_by_clan_id_typing: { method: "POST", path: "/clan-chat/{clan_id}/typing" },
  get_global_chat: { method: "GET", path: "/global-chat" },
  post_global_chat: { method: "POST", path: "/global-chat" },
  delete_global_chat_by_id: { method: "DELETE", path: "/global-chat/{id}" },
  get_global_chat_by_id: { method: "GET", path: "/global-chat/{id}" },
  get_global_chat_channels: { method: "GET", path: "/global-chat/channels" },
  post_global_chat_gift: { method: "POST", path: "/global-chat/gift" },
  post_global_chat_gift_drop: { method: "POST", path: "/global-chat/gift-drop" },
  post_global_chat_gift_drop_by_drop_id_claim: { method: "POST", path: "/global-chat/gift-drop/{drop_id}/claim" },
  get_global_chat_gift_options: { method: "GET", path: "/global-chat/gift/options" },
  get_global_chat_mentions_count: { method: "GET", path: "/global-chat/mentions/count" },
  get_global_chat_mentions_list: { method: "GET", path: "/global-chat/mentions/list" },
  post_global_chat_mentions_seen: { method: "POST", path: "/global-chat/mentions/seen" },
  delete_global_chat_messages_by_message_id: { method: "DELETE", path: "/global-chat/messages/{message_id}" },
  get_global_chat_messages_by_message_id: { method: "GET", path: "/global-chat/messages/{message_id}" },
  patch_global_chat_messages_by_message_id: { method: "PATCH", path: "/global-chat/messages/{message_id}" },
  post_global_chat_messages_by_message_id_report: { method: "POST", path: "/global-chat/messages/{message_id}/report" },
  get_global_chat_simple: { method: "GET", path: "/global-chat/simple" },
  delete_global_chat_speaking: { method: "DELETE", path: "/global-chat/speaking" },
  post_global_chat_speaking: { method: "POST", path: "/global-chat/speaking" },
  get_global_chat_sse_stream: { method: "GET", path: "/global-chat/sse/stream", sse: true },
  delete_global_chat_typing: { method: "DELETE", path: "/global-chat/typing" },
  post_global_chat_typing: { method: "POST", path: "/global-chat/typing" },
  delete_global_chat_by_message_id: { method: "DELETE", path: "/global-chat/{message_id}" },
  get_global_chat_by_message_id_replies: { method: "GET", path: "/global-chat/{message_id}/replies" },
  get_inbox: { method: "GET", path: "/inbox" },
  post_inbox_read_all: { method: "POST", path: "/inbox/read-all" },
  get_inbox_unread_count: { method: "GET", path: "/inbox/unread-count" },
  delete_inbox_by_inbox_id: { method: "DELETE", path: "/inbox/{inbox_id}" },
  post_inbox_by_inbox_id_read: { method: "POST", path: "/inbox/{inbox_id}/read" },
  delete_private_chat_messages_by_message_id: { method: "DELETE", path: "/private-chat/messages/{message_id}" },
  patch_private_chat_messages_by_message_id: { method: "PATCH", path: "/private-chat/messages/{message_id}" },
  get_private_chat_rooms: { method: "GET", path: "/private-chat/rooms" },
  post_private_chat_rooms: { method: "POST", path: "/private-chat/rooms" },
  delete_private_chat_rooms_by_room_id: { method: "DELETE", path: "/private-chat/rooms/{room_id}" },
  get_private_chat_rooms_by_room_id: { method: "GET", path: "/private-chat/rooms/{room_id}" },
  get_private_chat_rooms_by_room_id_messages: { method: "GET", path: "/private-chat/rooms/{room_id}/messages" },
  post_private_chat_rooms_by_room_id_messages: { method: "POST", path: "/private-chat/rooms/{room_id}/messages" },
  post_private_chat_rooms_by_room_id_read: { method: "POST", path: "/private-chat/rooms/{room_id}/read" },
  delete_private_chat_rooms_by_room_id_speaking: { method: "DELETE", path: "/private-chat/rooms/{room_id}/speaking" },
  post_private_chat_rooms_by_room_id_speaking: { method: "POST", path: "/private-chat/rooms/{room_id}/speaking" },
  delete_private_chat_rooms_by_room_id_typing: { method: "DELETE", path: "/private-chat/rooms/{room_id}/typing" },
  post_private_chat_rooms_by_room_id_typing: { method: "POST", path: "/private-chat/rooms/{room_id}/typing" },
  get_private_chat_sse_rooms_by_room_id: { method: "GET", path: "/private-chat/sse/rooms/{room_id}", sse: true },
  get_watchparty_v2_anime_by_anime_id: { method: "GET", path: "/watchparty/v2/anime/{anime_id}" },
  get_watchparty_v2_sessions: { method: "GET", path: "/watchparty/v2/sessions" },
  post_watchparty_v2_sessions: { method: "POST", path: "/watchparty/v2/sessions" },
  get_watchparty_v2_sessions_search: { method: "GET", path: "/watchparty/v2/sessions/search" },
  get_watchparty_v2_sessions_by_session_id: { method: "GET", path: "/watchparty/v2/sessions/{session_id}" },
  post_watchparty_v2_sessions_by_session_id_chat: { method: "POST", path: "/watchparty/v2/sessions/{session_id}/chat" },
  post_watchparty_v2_sessions_by_session_id_join: { method: "POST", path: "/watchparty/v2/sessions/{session_id}/join" },
  post_watchparty_v2_sessions_by_session_id_kick_by_user_id: { method: "POST", path: "/watchparty/v2/sessions/{session_id}/kick/{user_id}" },
  post_watchparty_v2_sessions_by_session_id_leave: { method: "POST", path: "/watchparty/v2/sessions/{session_id}/leave" },
  post_watchparty_v2_sessions_by_session_id_lock: { method: "POST", path: "/watchparty/v2/sessions/{session_id}/lock" },
  post_watchparty_v2_sessions_by_session_id_switch_episode: { method: "POST", path: "/watchparty/v2/sessions/{session_id}/switch-episode" },

  // === CLAN ===
  get_clans: { method: "GET", path: "/clans" },
  post_clans: { method: "POST", path: "/clans" },
  get_clans_friends_without_clan: { method: "GET", path: "/clans/friends-without-clan" },
  post_clans_invite_accept_by_invite_id: { method: "POST", path: "/clans/invite/accept/{invite_id}" },
  post_clans_invite_reject_by_invite_id: { method: "POST", path: "/clans/invite/reject/{invite_id}" },
  post_clans_invite_by_invite_id_accept: { method: "POST", path: "/clans/invite/{invite_id}/accept" },
  post_clans_invite_by_invite_id_reject: { method: "POST", path: "/clans/invite/{invite_id}/reject" },
  get_clans_leaderboard: { method: "GET", path: "/clans/leaderboard" },
  get_clans_me: { method: "GET", path: "/clans/me" },
  post_clans_upload_image: { method: "POST", path: "/clans/upload-image" },
  delete_clans_by_clan_id: { method: "DELETE", path: "/clans/{clan_id}" },
  get_clans_by_clan_id: { method: "GET", path: "/clans/{clan_id}" },
  post_clans_by_clan_id_invite_by_user_id: { method: "POST", path: "/clans/{clan_id}/invite/{user_id}" },
  post_clans_by_clan_id_join: { method: "POST", path: "/clans/{clan_id}/join" },
  post_clans_by_clan_id_leave: { method: "POST", path: "/clans/{clan_id}/leave" },
  delete_clans_by_clan_id_members_by_user_id: { method: "DELETE", path: "/clans/{clan_id}/members/{user_id}" },
  patch_clans_by_clan_id_members_by_user_id_role: { method: "PATCH", path: "/clans/{clan_id}/members/{user_id}/role" },
  get_clans_by_clan_id_missions: { method: "GET", path: "/clans/{clan_id}/missions" },
  post_clans_by_clan_id_missions_by_mission_id_claim: { method: "POST", path: "/clans/{clan_id}/missions/{mission_id}/claim" },

  // === WAIFU ===
  get_waifu_chat: { method: "GET", path: "/waifu-chat" },
  delete_waifu_chat_by_chat_id: { method: "DELETE", path: "/waifu-chat/{chat_id}" },
  get_waifu_chat_by_chat_id: { method: "GET", path: "/waifu-chat/{chat_id}" },
  get_waifu_chat_by_chat_id_affection: { method: "GET", path: "/waifu-chat/{chat_id}/affection" },
  delete_waifu_chat_by_chat_id_history: { method: "DELETE", path: "/waifu-chat/{chat_id}/history" },
  get_waifu_chat_by_chat_id_history: { method: "GET", path: "/waifu-chat/{chat_id}/history" },
  post_waifu_chat_by_chat_id_send: { method: "POST", path: "/waifu-chat/{chat_id}/send" },
  get_waifu_by_group_by_group: { method: "GET", path: "/waifu/by-group/{group}" },
  get_waifu_groups: { method: "GET", path: "/waifu/groups" },
  post_waifu_matches_by_match_id_vote: { method: "POST", path: "/waifu/matches/{match_id}/vote" },
  get_waifu_tournaments: { method: "GET", path: "/waifu/tournaments" },
  get_waifu_tournaments_active: { method: "GET", path: "/waifu/tournaments/active" },
  get_waifu_tournaments_by_tournament_id: { method: "GET", path: "/waifu/tournaments/{tournament_id}" },
  get_waifu_tournaments_by_tournament_id_matches: { method: "GET", path: "/waifu/tournaments/{tournament_id}/matches" },
  get_waifu_vote_cooldown_all_groups: { method: "GET", path: "/waifu/vote/cooldown/all-groups" },
  get_waifu_vote_terms: { method: "GET", path: "/waifu/vote/terms" },
  post_waifu_by_waifu_id_vote: { method: "POST", path: "/waifu/{waifu_id}/vote" },

  // === STORE, VIP & PEMBAYARAN ===
  get_avatar_borders_active: { method: "GET", path: "/avatar-borders/active" },
  post_avatar_borders_active: { method: "POST", path: "/avatar-borders/active" },
  post_avatar_borders_active_disable: { method: "POST", path: "/avatar-borders/active/disable" },
  get_avatar_borders_catalog: { method: "GET", path: "/avatar-borders/catalog" },
  get_avatar_borders_me: { method: "GET", path: "/avatar-borders/me" },
  post_avatar_borders_purchase: { method: "POST", path: "/avatar-borders/purchase" },
  get_avatar_borders_vip_eligibility: { method: "GET", path: "/avatar-borders/vip/eligibility" },
  post_clips: { method: "POST", path: "/clips" },
  get_clips_vip_eligibility: { method: "GET", path: "/clips/vip/eligibility" },
  get_nanim_pass: { method: "GET", path: "/nanim-pass" },
  post_nanim_pass_claim_mission: { method: "POST", path: "/nanim-pass/claim-mission" },
  post_nanim_pass_claim_reward: { method: "POST", path: "/nanim-pass/claim-reward" },
  post_nanim_pass_verify_premium: { method: "POST", path: "/nanim-pass/verify-premium" },
  post_payments_google_verify: { method: "POST", path: "/payments/google/verify" },
  post_payments_vip: { method: "POST", path: "/payments/vip" },
  get_prime_store_items: { method: "GET", path: "/prime-store/items" },
  post_prime_store_purchase: { method: "POST", path: "/prime-store/purchase" },
  get_profile_animations_active: { method: "GET", path: "/profile-animations/active" },
  post_profile_animations_active: { method: "POST", path: "/profile-animations/active" },
  post_profile_animations_active_disable: { method: "POST", path: "/profile-animations/active/disable" },
  get_profile_animations_catalog: { method: "GET", path: "/profile-animations/catalog" },
  get_profile_animations_me: { method: "GET", path: "/profile-animations/me" },
  post_profile_animations_purchase: { method: "POST", path: "/profile-animations/purchase" },
  post_redeem_apply: { method: "POST", path: "/redeem/apply" },
  get_redeem_history: { method: "GET", path: "/redeem/history" },
  get_store_badges: { method: "GET", path: "/store/badges" },
  post_store_badges_activate_one: { method: "POST", path: "/store/badges/activate-one" },
  post_store_badges_deactivate_one: { method: "POST", path: "/store/badges/deactivate-one" },
  get_store_borders: { method: "GET", path: "/store/borders" },
  post_store_borders_purchase: { method: "POST", path: "/store/borders/purchase" },
  get_store_coins_packs: { method: "GET", path: "/store/coins/packs" },
  get_store_coins_transactions: { method: "GET", path: "/store/coins/transactions" },
  get_store_items: { method: "GET", path: "/store/items" },
  post_store_purchase_badge: { method: "POST", path: "/store/purchase/badge" },
  post_store_purchase_sticker: { method: "POST", path: "/store/purchase/sticker" },
  post_store_purchase_vip: { method: "POST", path: "/store/purchase/vip" },
  get_store_stickers: { method: "GET", path: "/store/stickers" },
  post_store_stickers_custom: { method: "POST", path: "/store/stickers/custom" },
  get_store_superbadges: { method: "GET", path: "/store/superbadges" },
  post_store_superbadges_activate: { method: "POST", path: "/store/superbadges/activate" },
  get_store_superbadges_active: { method: "GET", path: "/store/superbadges/active" },
  post_store_superbadges_deactivate: { method: "POST", path: "/store/superbadges/deactivate" },
  get_store_vip_eligibility: { method: "GET", path: "/store/vip/eligibility" },
  get_store_wallet: { method: "GET", path: "/store/wallet" },
  get_topup_bonus_active: { method: "GET", path: "/topup-bonus/active" },
  post_vip_auto_renew: { method: "POST", path: "/vip/auto-renew" },
  get_vip_history: { method: "GET", path: "/vip/history" },
  get_vip_me: { method: "GET", path: "/vip/me" },
  post_vip_renew_coins: { method: "POST", path: "/vip/renew/coins" },
  get_vip_renew_price_by_name: { method: "GET", path: "/vip/renew/price/by-name" },
  get_vip_vip_plans: { method: "GET", path: "/vip/vip-plans" },
  get_voucher_vouchers: { method: "GET", path: "/voucher/vouchers" },
  get_voucher_vouchers_validate: { method: "GET", path: "/voucher/vouchers/validate" },

  // === EVENT & LEADERBOARD ===
  get_events_sign_in: { method: "GET", path: "/events/sign-in" },
  post_events_sign_in_claim: { method: "POST", path: "/events/sign-in/claim" },
  get_events_watch: { method: "GET", path: "/events/watch" },
  post_events_watch_claim: { method: "POST", path: "/events/watch/claim" },
  get_leaderboard: { method: "GET", path: "/leaderboard" },
  get_leaderboard_me: { method: "GET", path: "/leaderboard/me" },
  get_leaderboard_monthly_summary: { method: "GET", path: "/leaderboard/monthly-summary" },
  get_leaderboard_monthly_summary_available_months: { method: "GET", path: "/leaderboard/monthly-summary/available-months" },
  get_leaderboard_by_period: { method: "GET", path: "/leaderboard/{period}" },
  get_missions: { method: "GET", path: "/missions" },
  get_special_events: { method: "GET", path: "/special-events" },
  get_sponsors: { method: "GET", path: "/sponsors" },

  // === NOTIFIKASI & DIAGNOSTIK ===
  get_discord_status: { method: "GET", path: "/discord/status" },
  post_discord_unlink: { method: "POST", path: "/discord/unlink" },
  get_network_diag_ping: { method: "GET", path: "/network-diag/ping" },
  post_network_diag: { method: "POST", path: "/network-diag" },
  get_network_diag_history: { method: "GET", path: "/network-diag/history" },
  post_notifications_subscribe: { method: "POST", path: "/notifications/subscribe" },
  get_notifications_subscriptions: { method: "GET", path: "/notifications/subscriptions" },
  post_notifications_token: { method: "POST", path: "/notifications/token" },
  post_notifications_unsubscribe: { method: "POST", path: "/notifications/unsubscribe" },
  delete_sera_mc_link: { method: "DELETE", path: "/sera-mc/link" },
  post_sera_mc_link_code: { method: "POST", path: "/sera-mc/link-code" },
  get_sera_mc_status: { method: "GET", path: "/sera-mc/status" },
  post_upload_progress_start: { method: "POST", path: "/upload-progress/start", sse: true },
  get_upload_progress_by_upload_id: { method: "GET", path: "/upload-progress/{upload_id}", sse: true },

  // === LAINNYA ===
  delete_history: { method: "DELETE", path: "/history" },
  get_history: { method: "GET", path: "/history" },
  get_matches: { method: "GET", path: "/matches" },
  get_messages: { method: "GET", path: "/messages" },
  post_messages: { method: "POST", path: "/messages" },
  delete_messages_by_message_id: { method: "DELETE", path: "/messages/{message_id}" },
  patch_messages_by_message_id: { method: "PATCH", path: "/messages/{message_id}" },
  get_recent_watched: { method: "GET", path: "/recent-watched" },
  patch_role: { method: "PATCH", path: "/role" },
  get_user_settings: { method: "GET", path: "/user-settings" },
  patch_user_settings: { method: "PATCH", path: "/user-settings" },
  post_user_settings_comment_background: { method: "POST", path: "/user-settings/comment-background" }
};

const ALIASES = {
  ping: "get_network_diag_ping",
  settings: "get_settings",
  announcement: "get_announcement_get",
  home: "get_app_home_screen",
  latest: "get_anime_latest",
  donghua: "get_anime_popular_donghua",
  list: "get_anime",
  detail: "get_anime_by_anime_id",
  episodes: "get_episode_anime_by_anime_id",
  stream: "get_episode_by_episode_id",
  episode: "get_episode_by_episode_id",
  episode_next: "get_episode_by_episode_id_next",
  episode_download: "get_episode_download_episode_by_episode_id",
  genres: "get_anime_genres",
  genre: "get_anime_genre_by_genre",
  schedule: "get_anime_schedule",
  catalog: "get_anime_catalog",
  az: "get_anime_a_z",
  recommendations: "get_anime_recommendations",
  manga_list: "get_manga_list",
  manga_popular: "get_manga_popular",
  manga_updates: "get_manga_chapter_updates",
  manga_genres: "get_manga_genres",
  manga_search: "get_manga_search",
  manga_detail: "get_manga_by_manga_id",
  chapter: "get_chapters_by_chapter_id",
  comments: "get_comments",
  leaderboard: "get_leaderboard",
  waifu_groups: "get_waifu_groups",
  waifu_by_group: "get_waifu_by_group_by_group",
  waifu_tournaments: "get_waifu_tournaments",
  login: "post_auth_google_verify",
  refresh: "post_auth_refresh_token",
  logout: "post_auth_logout"
};

class NanimeClient {
  constructor() {
    this.base = "https://mainappsv1.nanimeid.xyz/2.1.0";
    this.ua = "Dart/3.5 (dart:io)";
    this.sseTimeoutMs = 4000;
  }

  b64e(obj) {
    try {
      return Buffer.from(JSON.stringify(obj || {})).toString("base64");
    } catch {
      return "";
    }
  }

  b64d(str) {
    try {
      return str ? JSON.parse(Buffer.from(str, "base64").toString("utf-8")) : {};
    } catch {
      return {};
    }
  }

  ctx(state, params = {}) {
    const d = this.b64d(state);
    return {
      access_token: params.access_token || params.token || d?.access_token || null,
      refresh_token: params.refresh_token || params.refreshToken || d?.refresh_token || null,
      user: d?.user || null
    };
  }

  resolveRouteKey(action) {
    if (!action) return null;
    if (ROUTES[action]) return action;
    if (ALIASES[action]) return ALIASES[action];
    if (action.startsWith("ep_") && ROUTES[action.slice(3)]) return action.slice(3);
    return null;
  }

  buildUrlAndRest(pathTemplate, params) {
    const usedKeys = new Set([
      "action",
      "state",
      "access_token",
      "refresh_token",
      "token",
      "sse_timeout"
    ]);
    const placeholders = [...pathTemplate.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]);

    let resolvedPath = pathTemplate;
    for (const key of placeholders) {
      let val = params[key];
      if ((val === undefined || val === "") && placeholders.length === 1 && params.id !== undefined && params.id !== "") {
        val = params.id;
        usedKeys.add("id");
      }
      if (val === undefined || val === null || String(val).trim() === "") {
        throw new Error(`Parameter path '${key}' wajib diisi untuk endpoint ${pathTemplate}.`);
      }
      usedKeys.add(key);
      resolvedPath = resolvedPath.replace(`{${key}}`, encodeURIComponent(String(val)));
    }

    const rest = {};
    for (const [k, v] of Object.entries(params)) {
      if (!usedKeys.has(k) && v !== undefined && v !== null && v !== "") {
        rest[k] = v;
      }
    }

    return { resolvedPath, rest };
  }

  async sendHttp(method, path, { query = null, body = null, c = null, sse = false, sseTimeoutMs = 4000 } = {}, retryAuth = true) {
    let qs = "";
    if (query && Object.keys(query).length > 0) {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
      }
      const s = sp.toString();
      if (s) qs = `?${s}`;
    }

    const url = path.startsWith("http") ? path : `${this.base}${path}${qs}`;
    const headers = {
      "User-Agent": this.ua,
      Accept: sse ? "text/event-stream" : "application/json"
    };
    if (body !== null && method !== "GET" && method !== "HEAD") {
      headers["Content-Type"] = "application/json";
    }
    if (c?.access_token) {
      headers.Authorization = `Bearer ${c.access_token}`;
    }

    const controller = sse ? new AbortController() : null;
    const timer = sse ? setTimeout(() => controller.abort(), Number(sseTimeoutMs) || this.sseTimeoutMs) : null;

    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        ...(body !== null && method !== "GET" && method !== "HEAD" ? { body: JSON.stringify(body) } : {}),
        ...(controller ? { signal: controller.signal } : {})
      });
    } catch (err) {
      if (timer) clearTimeout(timer);
      if (sse && err.name === "AbortError") {
        return { ok: true, status: 200, data: { events: [], note: "SSE stream closed on timeout" } };
      }
      throw err;
    }

    if (res.status === 401 && retryAuth && c?.refresh_token) {
      if (timer) clearTimeout(timer);
      const refRes = await fetch(`${this.base}/auth/refresh-token`, {
        method: "POST",
        headers: { "User-Agent": this.ua, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refreshToken: c.refresh_token })
      });
      if (refRes.ok) {
        const refJson = await refRes.json().catch(() => null);
        const d = refJson?.data || refJson;
        if (d?.access_token || d?.accessToken || d?.token) {
          c.access_token = d.access_token || d.accessToken || d.token;
          c.refresh_token = d.refresh_token || d.refreshToken || c.refresh_token;
          return this.sendHttp(method, path, { query, body, c, sse, sseTimeoutMs }, false);
        }
      }
    }

    if (sse) {
      const events = [];
      try {
        if (res.body) {
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = dec.decode(value, { stream: true });
            if (chunk.trim()) events.push(chunk);
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          if (timer) clearTimeout(timer);
          throw err;
        }
      } finally {
        if (timer) clearTimeout(timer);
      }
      return {
        ok: res.ok,
        status: res.status,
        data: { events }
      };
    }

    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok || data?.ok === false || data?.success === false) {
      return {
        ok: false,
        status: res.status,
        error: data?.message || data?.error || `HTTP ${res.status}`,
        data
      };
    }

    return { ok: true, status: res.status, data };
  }

  async execute(action, params = {}) {
    const c = this.ctx(params.state, params);

    try {
      // Penanganan khusus alias search (live vs paginated)
      if (action === "search") {
        const term = String(params.q ?? params.query ?? params.keyword ?? "").trim();
        if (!term) {
          return { status: false, result: { error: "Parameter 'q' wajib diisi." } };
        }
        const route = params.page ? ROUTES.get_anime_search_paginated : ROUTES.get_anime_live_search;
        const r = await this.sendHttp(route.method, route.path, {
          query: { q: term, page: params.page, limit: params.limit || 20, label: params.label, genre: params.genre },
          c
        });
        return this.formatResult(c, r);
      }

      // Penanganan khusus download video MP4 (mengembalikan URL atau pipe binary jika raw=true)
      if (action === "download") {
        let targetUrl = params.url;
        if (!targetUrl && (params.episode_id || params.id)) {
          const epId = params.episode_id || params.id;
          const epRes = await this.sendHttp("GET", `/episode/${encodeURIComponent(epId)}`, { c });
          if (!epRes.ok) return this.formatResult(c, epRes);
          const qualities = epRes.data?.data?.qualities || epRes.data?.qualities || [];
          const qName = String(params.quality || "720p").toLowerCase();
          const matched = qualities.find((q) => String(q.nama_quality || "").toLowerCase() === qName) || qualities[0];
          targetUrl = matched?.source_quality;
        }
        if (!targetUrl) {
          return { status: false, result: { error: "Parameter 'url' atau 'episode_id' wajib diisi." } };
        }
        if (params.raw === true || params.raw === "true") {
          const vidRes = await fetch(targetUrl);
          if (!vidRes.ok) throw new Error(`Download failed: HTTP ${vidRes.status}`);
          const buf = Buffer.from(await vidRes.arrayBuffer());
          return {
            status: true,
            _buffer: buf,
            _mime: vidRes.headers.get("content-type") || "video/mp4",
            result: { url: targetUrl, size: buf.length }
          };
        }
        return { status: true, result: { url: targetUrl } };
      }

      // Penanganan endpoint custom/raw langsung
      if (action === "raw" || action === "custom") {
        const method = String(params.method || "GET").toUpperCase();
        const path = String(params.path || params.endpoint || "");
        if (!path) {
          return { status: false, result: { error: "Parameter 'path' wajib diisi untuk action 'custom'." } };
        }
        const query = params.query && typeof params.query === "object" ? params.query : undefined;
        const body = params.body !== undefined ? params.body : undefined;
        const r = await this.sendHttp(method, path.startsWith("/") ? path : `/${path}`, { query, body, c });
        return this.formatResult(c, r);
      }

      const routeKey = this.resolveRouteKey(action);
      if (!routeKey || !ROUTES[routeKey]) {
        return {
          status: false,
          result: { error: `Action tidak dikenali: '${action}'.` }
        };
      }

      const route = ROUTES[routeKey];
      const { resolvedPath, rest } = this.buildUrlAndRest(route.path, params);

      let query = null;
      let body = null;
      if (route.method === "GET" || route.method === "HEAD") {
        query = rest;
      } else {
        if (rest._query && typeof rest._query === "object") {
          query = rest._query;
          delete rest._query;
        }
        if (route.authMode === "refresh" && !rest.refreshToken && !rest.refresh_token && c.refresh_token) {
          rest.refreshToken = c.refresh_token;
        } else if (route.authMode === "refresh" && rest.refresh_token && !rest.refreshToken) {
          rest.refreshToken = rest.refresh_token;
          delete rest.refresh_token;
        }
        body = Object.keys(rest).length > 0 ? rest : null;
      }

      const r = await this.sendHttp(route.method, resolvedPath, {
        query,
        body,
        c,
        sse: Boolean(route.sse),
        sseTimeoutMs: params.sse_timeout || this.sseTimeoutMs
      });

      if (r.ok) {
        const d = r.data?.data || r.data;
        if (route.authMode === "login" || route.authMode === "refresh") {
          c.access_token = d?.access_token || d?.accessToken || d?.token || c.access_token;
          c.refresh_token = d?.refresh_token || d?.refreshToken || c.refresh_token;
          if (d?.user) c.user = d.user;
        } else if (route.authMode === "logout") {
          c.access_token = null;
          c.refresh_token = null;
          c.user = null;
        }
      }

      return this.formatResult(c, r);
    } catch (e) {
      const b64 = this.b64e(c);
      return {
        status: false,
        result: { error: e?.message || "failed_nanime_request" },
        ...(c.access_token || c.refresh_token ? { state: b64, State: b64 } : {})
      };
    }
  }

  formatResult(c, r) {
    const b64 = this.b64e(c);
    const hasAuth = Boolean(c.access_token || c.refresh_token);
    if (!r.ok) {
      return {
        status: false,
        result: {
          error: r.error,
          code: r.status,
          detail: r.data
        },
        ...(hasAuth ? { state: b64, State: b64 } : {})
      };
    }
    return {
      status: true,
      result: r.data,
      ...(hasAuth ? { state: b64, State: b64 } : {})
    };
  }
}

async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : typeof req.body === "object" && req.body !== null ? req.body : {};

  const routeNames = Object.keys(ROUTES);
  const aliasNames = Object.keys(ALIASES);
  const extraActions = ["search", "download", "custom", "routes"];

  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      total_routes: routeNames.length,
      aliases: aliasNames,
      extra_actions: extraActions,
      hint: "Gunakan ?action=routes untuk melihat daftar lengkap semua endpoint yang didukung.",
      usage: {
        method: "GET / POST",
        examples: {
          routes: "/?action=routes",
          latest: "/?action=latest&page=1&limit=20",
          search_live: "/?action=search&q=naruto",
          search_paginated: "/?action=search&q=naruto&page=1&limit=10",
          detail: "/?action=detail&anime_id=2779",
          episodes: "/?action=episodes&anime_id=2779",
          stream: "/?action=stream&episode_id=39742",
          download_link: "/?action=download&episode_id=39742&quality=720p",
          manga_popular: "/?action=manga_popular&page=1&limit=20",
          waifu_groups: "/?action=waifu_groups",
          login: {
            url: "/?action=login",
            body: { id_token: "GOOGLE_ID_TOKEN" }
          },
          curl_fn_style: "/?action=ep_get_anime_latest&page=1&limit=20",
          custom: {
            url: "/?action=custom",
            body: { method: "GET", path: "/anime/latest", query: { page: 1, limit: 10 } }
          }
        }
      }
    });
  }

  if (action === "routes") {
    return res.status(200).json({
      status: true,
      action: "routes",
      total: routeNames.length,
      aliases: ALIASES,
      routes: Object.fromEntries(
        Object.entries(ROUTES).map(([k, v]) => [k, `${v.method} ${v.path}`])
      )
    });
  }

  const api = new NanimeClient();
  const isSpecial = ["search", "download", "custom", "raw"].includes(action);
  if (!isSpecial && !api.resolveRouteKey(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'. Gunakan ?action=routes untuk melihat daftar lengkap.`,
      aliases: aliasNames
    });
  }

  try {
    const response = await api.execute(action, params);

    if (response?.status && response._buffer) {
      res.setHeader("Content-Type", response._mime || "video/mp4");
      res.setHeader("Content-Disposition", `attachment; filename="nanime_${params.episode_id || params.id || "video"}.mp4"`);
      return res.status(200).send(response._buffer);
    }

    if (!response || response.status === false) {
      return res.status(502).json({
        status: false,
        action,
        error: response?.result?.error || "Gagal memproses request pada server NanimeID.",
        result: response?.result || null,
        ...(response?.state ? { state: response.state } : {})
      });
    }

    return res.status(200).json({
      action,
      ...response
    });
  } catch (error) {
    console.error(`[API HANDLER ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada Serverless Handler.",
      error: error?.message || "Unknown Error"
    });
  }
}

export default withApiLog(withRateLimit(handler));