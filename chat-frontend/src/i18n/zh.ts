'use client';

import { TranslationDict } from './types';

export const zh: TranslationDict = {
  common: {
    app_title: 'Video2SOP：将仪器教学视频转化为SOP',
    notification_test_title: '通知测试',
    notification_test_body: '浏览器通知功能已启用！',
    operation_history: '操作记录',
    connected: '已连接',
    disconnected: '未连接',
    reconnect: '重连',
    enabled: '已启用',
    notifications_not_enabled: '浏览器通知未启用',
    notifications_may_not_work: '通知不一定发挥效果',
    test: '测试',
    disable: '禁用',
    disabled: '已禁用',
    simulate: '模拟',
    enable: '启用',
    report_issue: '报告异常或建议',
    subscribe_updates: '订阅更新',
    no_records: '暂无操作记录',
    upload_to_show_records: '上传视频后将显示记录',
    deleted_count: '共删除 {count} 个文件',
    connected_resources: '已连接 {cpu_count}核 ({cpu_percent}%) / {memory_total_gb}GB ({memory_percent}%)',
    tech_stack: '技术栈',
    tech_ai_models: 'AI模型',
    tech_backend: '后端',
    tech_frontend: '前端',
    tech_storage: '存储',
    tech_ai_models_value: 'Qwen3-VL-Plus (视频理解) + Paraformer-V2 (语音识别) + Qwen-Plus (文本处理)',
    tech_backend_value: 'FastAPI + WebSocket + LangGraph Agent',
    tech_frontend_value: 'Next.js 15 + TypeScript + React 19 + Tailwind CSS + Material Symbols',
    tech_storage_value: '后端服务器和阿里云OSS',
    done_editing: '完成编辑',
    edit_block: '编辑区块',
    delete_block: '删除区块',
    enable_notifications: '启用通知',
    disable_notifications: '禁用通知',
    simulate_notifications: '模拟通知'
  },
  feedback: {
    title: '报告异常或提建议',
    intro_1: '请从下列选项中选择，然后将包含异常的当前会话内容、异常情况描述和建议发送至评论区或我们的邮箱：',
    intro_2: '我们会尽快修复异常或将需求纳入未来开发方向！',
    btn_with_video: '1. 下载当前会话内容，且我同意Video2SOP保留当前会话的视频用于分析',
    btn_without_video: '2. 下载当前会话内容，但我不同意Video2SOP保留当前会话的视频',
    btn_suggest_only: '3. 不下载会话内容，我只是提建议',
    download_failed: '下载报告失败，请重试'
  },
  subscribe: {
    title: '订阅功能更新通知',
    desc_line1: '如果你喜欢Video2SOP，或者觉得“教学视频转化为SOP”确实是实用策略，但这个工具仍需改进，',
    desc_line2: '欢迎写信订阅功能更新或关注本项目的 GitHub 仓库！',
    email_subscribe: '邮件订阅',
    email_hint: '发送邮件订阅功能更新通知',
    send_email: '发送邮件',
    github_repo: 'GitHub仓库',
    github_hint: '关注项目仓库获取最新更新和参与讨论',
    visit_github: '访问GitHub',
    email_subject: 'Video2SOP 功能更新订阅',
    email_body: '您好！\n\n我想订阅Video2SOP的功能更新通知。\n\n谢谢！'
  },
  status: {
    upload_start: '开始上传压缩视频',
    upload_done: '压缩视频上传完成',
    understanding_start: '开始视频理解（约1分钟）',
    understanding_done: '视频理解完成',
    long_understanding_done: '长视频理解完成',
    parse_start: '开始SOP拆解（约3分钟）',
    parse_done: 'SOP解析完成',
    refine_done: 'SOP精修完成',
    compressed_skipped: '检测到已压缩视频，跳过压缩',
    no_compression_needed: '视频无需压缩，已准备就绪',
    short_understanding_done: '短视频理解完成',
    parse_done_with_count: 'SOP解析完成，共生成 {count} 个区块',
    video_length_no_segment: '视频时长 {minutes}分{seconds}秒，不分段',
    video_length_segmented: '视频时长 {minutes}分{seconds}秒，分段',
    upload_compressed_done: '压缩视频上传完成',
    speech_done: '语音识别已完成',
    refine_done_with_count: 'SOP精修完成，共处理 {count} 个区块'
  },
  status_label: {
    success: '成功',
    error: '失败',
    processing: '处理中',
  },
  types: {
    upload: '视频上传',
    speech_recognition: '语音识别',
    video_understanding: '视频理解',
    video_compression: '视频压缩',
    sop_parse: '草稿解析',
    sop_refine: 'SOP精修',
    file_removed: '文件删除',
  }
};

// 动态扩展：上传组件
export const zhUploader = {
  uploader: {
    title: '视频上传',
    preview: '视频预览:',
    no_video_support: '您的浏览器不支持视频播放。',
    drop_or_click: '拖拽视频文件到这里，或点击选择文件',
    support_formats: '支持格式: MP4, MOV, AVI, MKV, WEBM (最大 {size_gb} GB)',
    data_protection: '数据保护：当您关闭或刷新网页时，我们不会保留您的视频。',
    choose_file: '选择文件',
    upload_and_compress_1080p: '上传并压缩至1080p',
    upload_and_compress_720p: '上传并压缩至720p',
    remove: '移除',
    or: '或者',
    load_example: '加载示例视频',
    upload_ok: '上传完成！',
    download_compressed: '下载压缩视频',
    keep_recommend: '推荐保存此压缩视频',
    keep_detail: '以后如果要重新处理该视频，推荐上传这个 Video2SOP 压缩过的视频，会减少上传用时并跳过压缩步骤。即使你上传原视频，Video2SOP也会压缩，以去掉对视频理解几乎无帮助的部分（主要是过多的帧）。',
    compressing: '正在压缩视频...',
    compression_done: '视频压缩完成，已删除原视频',
    compression_failed: '压缩失败',
    sign_failed: '获取上传签名失败',
    oss_upload_failed: '上传失败',
    proxy_failed: '代理上传失败',
    upload_failed: '视频上传失败',
    upload_done: '视频上传完成',
    upload_timeout: '视频上传超时，超过（{minutes}分钟），请报告给Video2SOP管理员。',
    audio_extract_failed: '音频提取失败',
    audio_extract_timeout: '音频提取超时，超过（{minutes}分钟），请报告给Video2SOP管理员。',
    file_too_large: '文件大小不能超过 {size}MB',
    unsupported_type: '不支持的文件格式。支持的格式: {types}',
    loading_example: '正在加载示例视频（进度条不准）',
    example_loaded: '粉末压块示例视频加载完成！',
    example_failed: '加载示例视频失败',
  }
};

export const zhSpeech = {
  speech: {
    title: '语音识别',
    ready_done: '语音识别已完成，如果不满意可以手动修改或重新识别',
    ready_upload_done: '视频已上传，可以进行语音识别',
    need_upload: '请先上传视频文件，然后即可进行语音识别',
    processing: '正在进行语音识别...',
    retry: '重试识别',
    start: '开始语音识别',
    need_upload_short: '请先上传视频',
    auto_failed: '自动语音识别失败',
    manual_retry: '请手动重试',
    result_title: '识别结果 ({count} 句)',
    sentence_index: '第 {index} 句',
    vocabulary_label: '易错词表',
    vocabulary_placeholder: '如果有词被大量错误识别为读音相近的词，你不想手动修改，那么请输入正确的词在这里，每行一个词，然后重新识别。'
  }
};

export const zhSOP = {
  sop: {
    editor_title: 'SOP编辑器',
    video_player: '视频播放器',
    block_labels: {
      title: '标题',
      abstract: '摘要',
      keywords: '关键词',
      materials: '材料试剂工具设备清单',
      step: '操作步骤',
      unknown: '其他内容'
    },
    parse_tip_done: 'SOP草稿已拆成区块。如果拆解错误很严重，可以重新拆解。如果是内容错误，请手动修改内容或重新做视频理解。',
    parse_tip_ready: '如果视频理解结果大致正确，则点击按钮将它拆解成区块。否则，修改提示词后重新做视频理解。',
    parsing: '拆解中...',
    parse_action: '拆解SOP草稿 (Qwen-Plus)',
    expand: '点击展开',
    collapse: '点击折叠',
    edit_area: '编辑区',
    add_step: '添加步骤',
    merge_selected: '合并选中',
    split_selected: '拆分选中',
    no_blocks: '暂无区块，请先拆解SOP草稿或添加新区块',
    refine_area: 'AI精修区',
    refine_tip: 'AI精修结果是只读的。如果想修改，请将精修结果替换当前编辑区的区块，随后甚至可以再次AI精修',
    replace: '替换',
    refine_empty: 'AI精修结果将显示在这里',
    user_notes: '用户批注和建议',
    user_notes_placeholder: '请输入对SOP的修改建议和批注...',
    chars: '字符',
    refining: '精修中...',
    refine_action: 'AI精修 (Qwen-Plus)',
    select_this_block: '选择此区块',
    drag_to_sort: '拖动以排序',
    tooltip: {
      play_at: '播放 {start}',
      play_range: '播放 {start} - {end}'
    },
    player: {
      current_video: '视频文件: ',
      no_video: '暂无视频文件',
      segment_label: '播放段:',
      jump_to_start: '跳转到开始',
      jump_to_end: '跳转到结束'
    }
  }
};

// 补充区块编辑字段
export const zhSOPBlockFields = {
  sop: {
    block_fields: {
      no_content: '暂无内容',
      playable: '可播放',
      content: '内容',
      content_placeholder: '输入区块内容...',
      begin_time: '开始时间',
      end_time: '结束时间',
      time_placeholder: '0',
      show_play_button: '显示播放按钮'
    }
  }
};

export const zhSOPTooltips = {
  sop: {
    tooltip: {
      play_at: '播放 {start}',
      play_range: '播放 {start} - {end}'
    }
  }
};

export const zhExporter = {
  exporter: {
    title: '导出SOP文档',
    select_area: '选择导出区域',
    edit_area: '编辑区',
    refine_area: '精修区',
    blocks: '个区块',
    txt_title: '纯文本格式 (.txt)',
    txt_desc: '适合编辑和发布于开发获取平台，例如',
    html_title: 'HTML关联格式 (.html)',
    html_desc1: '支持视频播放，适合实验室内部使用',
    html_desc2: '视频文件需与HTML文件在同一目录下，然后在HTML文件开头配置视频文件',
    exporting: '导出中...',
    export_txt: '导出TXT',
    export_html: '导出HTML',
    export_failed: '导出失败',
    export_failed_retry: '导出失败，请重试'
  }
};

export const zhExporterHtml = {
  exporter_html: {
    title: 'SOP 标准操作流程文档',
    video_config_title: '视频文件配置',
    current_video: '当前视频文件：',
    ensure_same_dir: '请确保视频文件与HTML文件在同一目录下',
    select_video: '选择视频文件',
    test_play: '测试播放',
    browser_not_support: '您的浏览器不支持视频播放。',
    click_to_play: '点击播放按钮开始观看',
    alert_not_found: '视频文件未找到，请确保视频文件"{name}"与HTML文件在同一目录下。',
    playing: '播放中:',
    play_done: '播放完成:',
    selected_file: '已选择:',
    testing: '测试中...',
    test_ok: '视频文件可正常播放',
    test_fail: '视频文件无法加载，请检查文件"{name}"是否存在',
    current_time: '(当前:',
    generated_by_prefix: '该文档由',
    generated_by_suffix: '生成'
  }
};

export const zhRecords = {
  records: {
    upload_start: '开始视频上传',
    upload_done: '视频和音频上传完成！',
    files_deleted: '视频和音频已从OSS删除',
    speech_done: '语音识别已完成',
    long_integration_done: '长视频整合完成'
  }
};

export const zhVideoUnderstanding = {
  vu: {
    title: '视频理解',
    model: '(Qwen3-VL-Plus)',
    need_upload: '请先上传视频文件',
    need_asr: '请先执行语音识别获取音频内容',
    ready_hint: '修改提示词，开始视频理解',
    prompt_label: '提示词',
    prompt_placeholder: '请输入您的提示词...',
    chars: '字符',
    params_title: '视频处理参数',
    expand: '点击展开',
    collapse: '点击折叠',
    fps_label: '视频抽帧参数 (FPS)',
    fps_help: '表示每1秒视频中抽取 {fps} 帧用于理解。FPS越大越可靠，但更耗时。',
    seg_params: '视频分段参数',
    seg_threshold: '判定分段阈值（分钟）',
    seg_threshold_help: '超过此时长将分段处理',
    seg_length: '片段时长上限（分钟）',
    seg_length_help: '每个片段的最大时长',
    seg_overlap: '片段重叠（分钟）',
    seg_overlap_help: '相邻片段的重叠时长',
    seg_summary: '当前设置：视频超过 {threshold} 分钟将分段，每段最长 {length} 分钟，重叠 {overlap} 分钟',
    seg_constraints: '约束条件：片段时长上限 < 判定分段阈值，片段重叠 < 片段时长上限，所有参数最大18分钟',
    factors_title: '各环节用时典型值',
    factors_expand: '点击展开',
    factors_collapse: '点击折叠',
    run_btn: '开始视频理解',
    run_btn_processing: '正在分析视频...',
    run_btn_prereq: '请先完成前置步骤',
    waiting_compress_doing: '正在压缩视频，请等待压缩完成...',
    waiting_compress_idle: '等待视频压缩...',
    wait_compress_first: '请等待压缩完成并文件就绪后，再开始视频理解。',
    waiting_compress_error: '视频压缩失败，无法进行视频理解',
    edited_speech_note: '将使用编辑后的语音内容进行视频理解',
    error_prefix: '视频理解失败',
    result_title: '视频理解结果',
    view_rendered: 'Markdown 渲染',
    view_source: '源码',
    segments_title: '分段结果',
    segment_item: '片段 {id}（{range}）',
    status_completed: '已完成',
    status_processing: '处理中',
    status_error: '错误',
    integrated_title: '整合后的SOP草稿',
    empty_ready_title: '点击上方“开始视频理解”按钮',
    empty_ready_desc: '系统将结合语音内容分析视频中的操作步骤'
    ,
    table_video_len: '视频时长(min)',
    table_file_size: '文件大小',
    table_compression_720p: '视频压缩(720p，2核)',
    table_compression_1080p: '视频压缩(1080p，2核)',
    table_resolution: '分辨率 (px)',
    table_upload: '视频上传 (min)',
    table_asr: '语音识别 (min)',
    table_understanding: '视频理解 (min)',
    table_parse: '草稿解析 (min)',
    table_refine: 'AI精修 (min)'
  }
};


