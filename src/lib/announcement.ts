/** 公告正文清洗为纯文本:去 <style>/<script>/HTML 标签、常见实体、图片标记、**加粗/# 标题,压多余空白。
 *  服务端与客户端公用(AnnouncementList 夹行展示用纯文本)。 */
export function cleanAnnouncement(content: string): string {
  return content
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g, "") // 去图片标记(列表夹行不显图)
    .replace(/\*\*/g, "").replace(/^#+\s*/gm, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
