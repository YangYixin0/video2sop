'use client';

import { TranslationDict } from './types';

export const en: TranslationDict = {
  common: {
    app_title: 'Video2SOP: Convert instructional videos to SOP',
    notification_test_title: 'Notification Test',
    notification_test_body: 'Browser notifications are enabled!',
    operation_history: 'Operation History',
    connected: 'Connected',
    disconnected: 'Disconnected',
    reconnect: 'Reconnect',
    enabled: 'Enabled',
    notifications_not_enabled: 'Browser notifications are not enabled',
    notifications_may_not_work: 'Notifications may not always work',
    test: 'Test',
    disable: 'Disable',
    simulate: 'Simulate',
    enable: 'Enable',
    enable_notifications: 'Enable notifications',
    disable_notifications: 'Disable notifications',
    simulate_notifications: 'Simulate notification',
    disabled: 'Disabled',
    report_issue: 'Report issue or suggestion',
    subscribe_updates: 'Subscribe updates',
    no_records: 'No operation records',
    deleted_count: 'Deleted {count} files',
    connected_resources: 'Connected {cpu_count} cores ({cpu_percent}%) / {memory_total_gb}GB ({memory_percent}%)',
    tech_stack: 'Tech Stack',
    tech_ai_models: 'AI Models',
    tech_backend: 'Backend',
    tech_frontend: 'Frontend',
    tech_storage: 'Storage',
    tech_ai_models_value: 'Qwen3-VL-Plus (video understanding) + Paraformer-V2 (ASR) + Qwen-Plus (text processing)',
    tech_backend_value: 'FastAPI + WebSocket + LangGraph Agent',
    tech_frontend_value: 'Next.js 15 + TypeScript + React 19 + Tailwind CSS + Material Symbols',
    tech_storage_value: 'Backend server and Aliyun OSS',
    done_editing: 'Done',
    edit_block: 'Edit block',
    delete_block: 'Delete block'
  },
  feedback: {
    title: 'Report issues or suggestions',
    intro_1: 'Choose an option below, then send the current session with issues and/or your suggestions to the comments or our email: ',
    intro_2: 'We will fix issues as soon as possible, or consider requests for future development!',
    btn_with_video: '1. Download the current session (and approve us to use the video for analysis)',
    btn_without_video: '2. Download the current session (and disapprove us to use the video for analysis)',
    btn_suggest_only: '3. Do not download, I just want to leave a suggestion',
    download_failed: 'Failed to download the report. Please retry.'
  },
  subscribe: {
    title: 'Subscribe to updates',
    desc_line1: 'If you like Video2SOP, or think "instructional video to SOP" is useful but this tool needs improvement,',
    desc_line2: 'welcome to subscribe via email or follow our GitHub repo!',
    email_subscribe: 'Email subscription',
    email_hint: 'Send an email to subscribe to updates',
    send_email: 'Send email',
    github_repo: 'GitHub Repository',
    github_hint: 'Follow the repository for updates and discussions',
    visit_github: 'Visit GitHub',
    email_subject: 'Video2SOP Update Subscription',
    email_body: 'Hello!\n\nI would like to subscribe to Video2SOP update notifications.\n\nThanks!'
  },
  status: {
    upload_start: 'Start uploading compressed video',
    upload_done: 'Compressed video uploaded',
    understanding_start: 'Start video understanding (~1 minute)',
    understanding_done: 'Video understanding completed',
    long_understanding_done: 'Long video understanding completed',
    parse_start: 'Start SOP parsing (~3 minutes)',
    parse_done: 'SOP parsing completed',
    refine_done: 'SOP refinement completed',
    compressed_skipped: 'Compressed video detected, skipping compression',
    no_compression_needed: 'No compression needed, ready',
    short_understanding_done: 'Short video understanding completed',
    parse_done_with_count: 'SOP parsing completed, generated {count} blocks',
    video_length_no_segment: 'Video length {minutes}m{seconds}s, no segmentation',
    video_length_segmented: 'Video length {minutes}m{seconds}s, segmented',
    upload_compressed_done: 'Compressed video uploaded',
    speech_done: 'Speech recognition completed',
    refine_done_with_count: 'SOP refinement completed, processed {count} blocks'
  },
  status_label: {
    success: 'Success',
    error: 'Error',
    processing: 'Processing',
  },
  types: {
    upload: 'Upload',
    speech_recognition: 'Speech Recognition',
    video_understanding: 'Video Understanding',
    video_compression: 'Video Compression',
    sop_parse: 'SOP Parsing',
    sop_refine: 'SOP Refinement',
    file_removed: 'Files Deleted',
  }
};

// Uploader
export const enUploader = {
  uploader: {
    title: 'Video Upload',
    preview: 'Preview:',
    no_video_support: 'Your browser does not support video playback.',
    drop_or_click: 'Drag and drop a video here, or click to choose',
    support_formats: 'Supported formats: MP4, MOV, AVI, MKV, WEBM (max {size_gb} GB)',
    data_protection: 'Data protection: we do not retain your video when you close or refresh the page.',
    choose_file: 'Choose File',
    upload_and_compress_1080p: 'Upload & compress to 1080p',
    upload_1080p_tooltip: '1080p may yield slightly more accurate video understanding results than 720p',
    upload_and_compress_720p: 'Upload & compress to 720p',
    upload_720p_tooltip: '720p compression is faster than 1080p',
    remove: 'Remove',
    or: 'or',
    load_example: 'Load Example Video',
    upload_ok: 'Upload completed!',
    download_compressed: 'Download Compressed Video',
    keep_recommend: 'We recommend keeping this compressed video',
    keep_detail: 'For future processing, uploading this Video2SOP-compressed video reduces upload time and skips compression. Even if you upload the original video, Video2SOP will still compress to remove frames with little value for understanding.',
    compressing: 'Compressing video...',
    compression_done: 'Video compression finished; original video deleted',
    compression_failed: 'Compression failed',
    sign_failed: 'Failed to get upload signature',
    oss_upload_failed: 'upload failed',
    proxy_failed: 'Proxy upload failed',
    upload_failed: 'Video upload failed',
    upload_done: 'Video upload completed',
    uploading_hint: 'Uploading video...',
    upload_timeout: 'Video upload timed out (> {minutes} minutes). Please report to Video2SOP admin.',
    audio_extract_failed: 'Audio extraction failed',
    audio_extract_timeout: 'Audio extraction timed out (> {minutes} minutes). Please report to Video2SOP admin.',
    file_too_large: 'File size must not exceed {size}MB',
    unsupported_type: 'Unsupported format. Supported: {types}',
    loading_example: 'Loading example video (progress not accurate)',
    example_loaded: 'Example video loaded!',
    example_failed: 'Failed to load example video',
    no_audio_stream: 'This video does not contain audio and does not meet task expectations. Processing is temporarily unavailable.',
  }
};

export const enSpeech = {
  speech: {
    title: 'Speech Recognition',
    ready_done: 'Speech recognition completed. Edit manually or re-run if needed',
    ready_upload_done: 'Video uploaded. You can run speech recognition',
    need_upload: 'Please upload the video file first, then run speech recognition',
    processing: 'Running speech recognition...',
    retry: 'Retry recognition',
    start: 'Start speech recognition',
    need_upload_short: 'Please upload the video',
    auto_failed: 'Auto speech recognition failed',
    manual_retry: 'Please retry manually',
    result_title: 'Recognition Results ({count} sentences)',
    sentence_index: 'Sentence {index}',
    vocabulary_label: 'Vocabulary',
    vocabulary_placeholder: 'If certain words are frequently misrecognized as similar-sounding words and you prefer not to manually correct them, please enter the correct words here, one per line, and then re-recognize.'
  }
};

export const enSOP = {
  sop: {
    editor_title: 'SOP Editor',
    video_player: 'Video Player',
    block_labels: {
      title: 'Title',
      abstract: 'Abstract',
      keywords: 'Keywords',
      materials: 'Materials / Reagents / Tools / Equipment',
      step: 'Step',
      unknown: 'Other'
    },
    parse_tip_done: 'The SOP draft has been split into blocks. If splitting is largely incorrect, re-split. If content is wrong, edit manually or rerun video understanding.',
    parse_tip_ready: 'If the video understanding result looks correct, click the button to split into blocks; otherwise, adjust the prompt and rerun understanding.',
    parsing: 'Parsing...',
    parse_action: 'Split SOP Draft (Qwen-Plus)',
    expand: 'Expand',
    collapse: 'Collapse',
    edit_area: 'Edit Area',
    add_step: 'Add Step',
    merge_selected: 'Merge Selected',
    split_selected: 'Split Selected',
    no_blocks: 'No blocks yet. Split the SOP draft or add a new block',
    refine_area: 'AI Refinement',
    refine_tip: 'AI refinement result is read-only. To modify, replace current edit blocks with refined result, then you can refine again.',
    replace: 'Replace',
    refine_empty: 'AI refinement result will appear here',
    user_notes: 'User notes and suggestions',
    user_notes_placeholder: 'Enter your suggestions and notes for the SOP...',
    chars: 'chars',
    refining: 'Refining...',
    refine_action: 'AI Refine (Qwen-Plus)',
    select_this_block: 'Select this block',
    drag_to_sort: 'Drag to sort'
  }
};

// Block editor field labels
export const enSOPBlockFields = {
  sop: {
    block_fields: {
      no_content: 'No content',
      playable: 'Playable',
      content: 'Content',
      content_placeholder: 'Enter block content...',
      begin_time: 'Begin time',
      end_time: 'End time',
      time_placeholder: '0',
      show_play_button: 'Show play button'
    }
  }
};

export const enSOPTooltips = {
  sop: {
    tooltip: {
      play_at: 'Play {start}',
      play_range: 'Play {start} - {end}'
    }
  }
};

export const enSOPPlayer = {
  sop: {
    player: {
      current_video: 'Video file: ',
      no_video: 'No video file',
      segment_label: 'Segment:',
      jump_to_start: 'Jump to start',
      jump_to_end: 'Jump to end'
    }
  }
};

export const enExporter = {
  exporter: {
    title: 'Export SOP Document',
    select_area: 'Select Export Area',
    edit_area: 'Edit Area',
    refine_area: 'Refined Area',
    blocks: 'blocks',
    txt_title: 'Plain Text (.txt)',
    txt_desc1: 'Suitable for freely editing.',
    txt_desc2: 'Suitable for publishing on open access platforms, such as',
    html_title: 'HyperText (.html)',
    html_desc1: 'Supports video playback; suitable for internal lab use.',
    html_desc2: 'Place the video file in the same folder as the HTML, then configure the video at the top of the HTML file',
    html_desc3_part1: 'If you want to modify the styles, you can copy the HTML file content (open with Notepad) to ',
    html_desc3_link: 'Qwen web preview mode',
    html_desc3_part2: ', request a preview and then collaborate with Qwen to modify it.',
    exporting: 'Exporting...',
    export_txt: 'Export TXT',
    export_html: 'Export HTML',
    export_failed: 'Export failed',
    export_failed_retry: 'Export failed, please retry'
  }
};

export const enExporterHtml = {
  exporter_html: {
    title: 'Standard Operating Procedure Document',
    video_config_title: 'Video File Configuration',
    current_video: 'Current video file:',
    ensure_same_dir: 'Ensure the video file is in the same folder as this HTML',
    select_video: 'Select Video File',
    test_play: 'Test Play',
    browser_not_support: 'Your browser does not support video playback.',
    click_to_play: 'Click play to start',
    alert_not_found: 'Video file not found. Ensure "{name}" is in the same folder as this HTML.',
    playing: 'Playing:',
    play_done: 'Finished:',
    selected_file: 'Selected:',
    testing: 'Testing...',
    test_ok: 'Video can play',
    test_fail: 'Video cannot be loaded. Check if "{name}" exists',
    current_time: '(current:',
    generated_by_prefix: 'This document is generated by',
    generated_by_suffix: ''
  }
};

export const enRecords = {
  records: {
    upload_start: 'Start uploading video',
    upload_done: 'Video and audio uploaded!',
    files_deleted: 'Video and audio deleted from OSS',
    speech_done: 'Speech recognition completed',
    long_integration_done: 'Long video integration completed'
  }
};

export const enVideoUnderstanding = {
  vu: {
    title: 'Video Understanding',
    model: '(Qwen3-VL-Plus)',
    need_upload: 'Please upload the video file first',
    need_asr: 'Please run speech recognition to get audio content',
    ready_hint: 'Adjust the prompt, then start understanding',
    prompt_label: 'Prompt',
    prompt_placeholder: 'Enter your prompt...',
    chars: 'chars',
    params_title: 'Video Processing Parameters',
    expand: 'Expand',
    collapse: 'Collapse',
    fps_label: 'Frame Sampling (FPS)',
    fps_help: '{fps} frames per second are sampled for understanding. Higher FPS may be more reliable but slower.',
    seg_params: 'Segmentation Parameters',
    seg_threshold: 'Split threshold (minutes)',
    seg_threshold_help: 'Videos longer than this will be segmented',
    seg_length: 'Segment length limit (minutes)',
    seg_length_help: 'Max length per segment',
    seg_overlap: 'Segment overlap (minutes)',
    seg_overlap_help: 'Overlap between adjacent segments',
    seg_summary: 'Current: split > {threshold} min, max {length} min/segment, overlap {overlap} min',
    seg_constraints: 'Constraints: segment length < split threshold; overlap < segment length; all ≤ 18 min',
    factors_title: 'Typical Durations by Stage',
    factors_expand: 'Expand',
    factors_collapse: 'Collapse',
    run_btn: 'Start Video Understanding',
    run_btn_processing: 'Analyzing video...',
    run_btn_prereq: 'Complete prerequisites first',
    waiting_compress_doing: 'Compressing video, please wait...',
    waiting_compress_idle: 'Waiting for compression...',
    wait_compress_first: 'Please wait until compression is completed and the file is ready, then start understanding again.',
    waiting_compress_error: 'Compression failed; cannot run understanding',
    edited_speech_note: 'Edited speech will be used for understanding',
    error_prefix: 'Video understanding failed',
    result_title: 'Video Understanding Result',
    view_rendered: 'Markdown Rendered',
    view_source: 'Source',
    segments_title: 'Segment Results',
    segment_item: 'Segment {id} ({range})',
    status_completed: 'Completed',
    status_processing: 'Processing',
    status_error: 'Error',
    integrated_title: 'Integrated SOP Draft',
    empty_ready_title: 'Click “Start Video Understanding” above',
    empty_ready_desc: 'The system will analyze steps using the speech content'
    ,
    table_video_len: 'Video length (min)',
    table_file_size: 'File size',
    table_compression_720p: 'Compression (720p, 2 cores)',
    table_compression_1080p: 'Compression (1080p, 2 cores)',
    table_resolution: 'Resolution (px)',
    table_upload: 'Upload (min)',
    table_asr: 'ASR (min)',
    table_understanding: 'Understanding (min)',
    table_parse: 'Parsing (min)',
    table_refine: 'Refinement (min)'
  }
};


