import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from "@react-pdf/renderer";
import {
  profile,
  experience,
  education,
  skills,
  ecosystem,
} from "./resume-data";

const C = {
  brand: "#10b981",
  brandDark: "#047857",
  ink: "#0f172a",
  text: "#334155",
  muted: "#64748b",
  rule: "#e2e8f0",
  bg: "#f8fafc",
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.text,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 44,
    lineHeight: 1.45,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: C.brand,
    paddingBottom: 14,
    marginBottom: 18,
  },
  name: {
    fontSize: 24,
    fontWeight: 700,
    color: C.ink,
    letterSpacing: -0.3,
    lineHeight: 1.2,
    marginBottom: 5,
  },
  role: {
    fontSize: 11,
    color: C.brandDark,
    fontWeight: 600,
    lineHeight: 1.2,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 9,
    color: C.muted,
    lineHeight: 1.2,
  },
  contactCol: {
    flexDirection: "column",
    alignItems: "flex-end",
    fontSize: 9,
    color: C.muted,
  },
  contactItem: { marginBottom: 2 },
  contactLink: { color: C.brandDark, textDecoration: "none" },

  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: C.ink,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: C.rule,
  },

  summary: { fontSize: 10, color: C.text },

  job: { marginBottom: 10 },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  jobRole: { fontSize: 11, fontWeight: 700, color: C.ink },
  jobPeriod: { fontSize: 9, color: C.muted },
  jobCompany: {
    fontSize: 10,
    color: C.brandDark,
    fontWeight: 600,
    marginBottom: 4,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 2,
  },
  bulletDot: { color: C.brand, marginRight: 6, fontSize: 10 },
  bulletText: { flex: 1, fontSize: 9.5 },

  educationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  educationDegree: { fontWeight: 700, color: C.ink, fontSize: 10.5 },
  educationSchool: { color: C.brandDark, fontSize: 10 },
  educationYear: { color: C.muted, fontSize: 9 },

  skillCat: { marginBottom: 6 },
  skillCatName: {
    fontSize: 9.5,
    fontWeight: 700,
    color: C.ink,
    marginBottom: 3,
  },
  skillRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  skillChip: {
    fontSize: 9,
    color: C.brandDark,
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 4,
    marginBottom: 3,
  },

  ecosystemDesc: { fontSize: 9.5, marginBottom: 4 },
  ecosystemItem: {
    fontSize: 9,
    color: C.muted,
    marginBottom: 2,
    paddingLeft: 8,
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    fontSize: 8,
    color: C.muted,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: C.rule,
    paddingTop: 6,
  },
});

export function ResumeDocument() {
  return (
    <Document
      title={`${profile.name} — Resume`}
      author={profile.name}
      subject={`${profile.role} Resume`}
      creator="watcharin-service.com"
      producer="watcharin-service.com"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.name}>{profile.name}</Text>
            <Text style={s.role}>{profile.role}</Text>
            <Text style={s.tagline}>{profile.tagline}</Text>
          </View>
          <View style={s.contactCol}>
            <Text style={s.contactItem}>
              <Link src={`mailto:${profile.email}`} style={s.contactLink}>
                {profile.email}
              </Link>
            </Text>
            <Text style={s.contactItem}>
              <Link src={`https://${profile.website}`} style={s.contactLink}>
                {profile.website}
              </Link>
            </Text>
            <Text style={s.contactItem}>
              <Link src={`https://${profile.github}`} style={s.contactLink}>
                {profile.github}
              </Link>
            </Text>
            <Text style={s.contactItem}>
              <Link src={`https://${profile.linkedin}`} style={s.contactLink}>
                {profile.linkedin}
              </Link>
            </Text>
            <Text style={s.contactItem}>{profile.location}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Summary</Text>
          <Text style={s.summary}>{profile.summary}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Experience</Text>
          {experience.map((job) => (
            <View key={job.company} style={s.job} wrap={false}>
              <View style={s.jobHeader}>
                <Text style={s.jobRole}>{job.role}</Text>
                <Text style={s.jobPeriod}>{job.period}</Text>
              </View>
              <Text style={s.jobCompany}>{job.company}</Text>
              {job.bullets.map((b, i) => (
                <View key={i} style={s.bullet}>
                  <Text style={s.bulletDot}>•</Text>
                  <Text style={s.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.sectionTitle}>Education</Text>
          <View style={s.educationRow}>
            <View>
              <Text style={s.educationDegree}>{education.degree}</Text>
              <Text style={s.educationSchool}>{education.school}</Text>
            </View>
            <Text style={s.educationYear}>{education.year}</Text>
          </View>
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.sectionTitle}>Skills & Tech Stack</Text>
          {skills.map((cat) => (
            <View key={cat.category} style={s.skillCat}>
              <Text style={s.skillCatName}>{cat.category}</Text>
              <View style={s.skillRow}>
                {cat.items.map((item) => (
                  <Text key={item} style={s.skillChip}>
                    {item}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.sectionTitle}>Currently Building — {ecosystem.name}</Text>
          <Text style={s.ecosystemDesc}>{ecosystem.description}</Text>
          {ecosystem.systems.map((sys) => (
            <Text key={sys} style={s.ecosystemItem}>
              · {sys}
            </Text>
          ))}
        </View>

        <Text style={s.footer} fixed>
          {profile.name} · {profile.email} · {profile.website}
        </Text>
      </Page>
    </Document>
  );
}
