import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

interface Section {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  titleHi: string;
  content: string;
  contentHi: string;
  important?: boolean;
}

const SECTIONS: Section[] = [
  {
    id: "platform",
    icon: "information-outline",
    iconColor: Colors.info,
    title: "About Loading Fast India (LFI)",
    titleHi: "Loading Fast India (LFI) ke baare mein",
    content:
      "Loading Fast India (LFI) is a technology-based intermediary platform that connects Merchants (consignors/shippers) and Drivers (transporters/carriers) for logistics and freight services across India. LFI acts solely as a facilitator and does NOT directly participate in any transportation, freight, or financial transaction.",
    contentHi:
      "Loading Fast India (LFI) ek technology-aadharit madyastha platform hai jo Merchants (maal bhejne wale) aur Drivers (transport karne wale) ko logistics aur freight services ke liye jodta hai. LFI sirf ek suvidha pradaata hai aur directly kisi bhi transport, freight, ya arthik lenden mein SHAMIL NAHI HOTA.",
  },
  {
    id: "commission",
    icon: "percent-outline",
    iconColor: Colors.primary,
    title: "Commission-Only Business Model",
    titleHi: "Sirf Commission aadharit vyavsay model",
    content:
      "LFI charges a fixed 5% service commission on each freight transaction. This commission is deducted transparently from the freight amount agreed upon by the Merchant and Driver. Beyond this commission, LFI has NO financial interest, ownership, or liability in the freight amount, goods, or transportation contract between parties.",
    contentHi:
      "LFI har freight transaction par nishchit 5% service commission leta hai. Ye commission Merchant aur Driver dwara tay kiye gaye freight amount se seedha kaat li jaati hai. Is commission ke alawa, LFI ka freight amount, maal, ya partiyoon ke beech transportation contract mein KISI BHI PRAKAAR ka arthik hit, swamitva, ya dayitva NAHI HAI.",
    important: true,
  },
  {
    id: "liability",
    icon: "shield-off-outline",
    iconColor: Colors.warning,
    title: "Limitation of Liability — Important",
    titleHi: "Dayitva ki Seema — Mahatvapurna",
    content:
      "LFI is NOT responsible or liable for:\n\n• Any fraud, cheating, or misrepresentation committed by any Merchant or Driver\n• Loss, damage, theft, or delay of goods during transit\n• Non-payment of freight charges between Merchant and Driver\n• Quality, quantity, or condition of goods transported\n• Any accidents, injuries, or third-party losses during transportation\n• Disputes arising out of the transportation contract between parties\n• Any criminal or civil liability arising from illegal goods or activities\n\nThe freight contract is exclusively between the Merchant and the Driver. LFI is merely a technology intermediary.",
    contentHi:
      "LFI zimmedar NAHI hai:\n\n• Kisi bhi Merchant ya Driver dwara kiye gaye fraud, thagee, ya galat jaankaari ke liye\n• Transit ke dauran maal ki haani, kharabi, chori, ya deri ke liye\n• Merchant aur Driver ke beech freight bhugtan na karne ke liye\n• Transport kiye gaye maal ki quality, maatra, ya sthiti ke liye\n• Transportation ke dauran kisi bhi durghatna, chot, ya teesre paksha ki haani ke liye\n• Partiyoon ke beech transportation anubandh se utpann vivaadon ke liye\n• Aavaadh maal ya gatividhiyon se utpann kisi bhi faujdaari ya deevaani dayitva ke liye\n\nFreight contract exclusively Merchant aur Driver ke beech hai. LFI sirf ek technology suvidhaadata hai.",
    important: true,
  },
  {
    id: "fraud",
    icon: "alert-octagon-outline",
    iconColor: Colors.error,
    title: "Fraud Prevention & Legal Action",
    titleHi: "Dhokhadhi Rokna aur Kanooni Karvayi",
    content:
      "KYC Verification: LFI collects Aadhaar and GST details to verify Merchant identity, reducing the risk of fraud.\n\nIn case of fraud by any party:\n• The aggrieved party may file a police complaint / FIR under IPC Section 420 (Cheating) or other applicable laws\n• Consumer court, civil court, or arbitration proceedings can be initiated\n• LFI will cooperate with law enforcement agencies and provide KYC records / transaction logs when required by lawful authority\n• LFI reserves the right to permanently ban any user found guilty of fraud or misuse\n\nBoth Merchants and Drivers are individually responsible under Indian law for their conduct.",
    contentHi:
      "KYC Verification: LFI Merchant ki pahchan verify karne ke liye Aadhaar aur GST details leta hai, jisse fraud ka jokhim kam hota hai.\n\nKisi bhi party dwara fraud hone par:\n• Peedit paksha IPC Section 420 (Thagee) ya anya laagu kaanoon ke tahat police complaint/FIR darj kar sakta hai\n• Consumer court, civil court, ya arbitration proceedings shuru ki ja sakti hai\n• LFI kanooni adhikaariyon ke saath sahayog karega aur kanooni adhikaari dwara maange jaane par KYC records / transaction logs provide karega\n• LFI ko adhikar hai ke wo fraud ya durupayog mein doshi paye gaye kisi bhi user ko sthayi roop se band kar sake\n\nDono Merchants aur Drivers apne aacharan ke liye Indian kaanoon ke tahat vyaktigat roop se zimmedar hain.",
  },
  {
    id: "userduties",
    icon: "handshake-outline",
    iconColor: Colors.success,
    title: "User Responsibilities",
    titleHi: "User ki Zimmedaariyan",
    content:
      "By using LFI, you agree that:\n\n• All information provided during registration is accurate and genuine\n• You will NOT use LFI for transporting illegal, prohibited, or hazardous goods\n• You will NOT engage in price manipulation, fake bookings, or misleading listings\n• You will resolve freight disputes directly with the counterparty\n• You will NOT hold LFI liable for losses arising from transactions on the platform\n• You have the legal right to enter into transportation contracts in India",
    contentHi:
      "LFI ka upyog karke, aap yeh maan lete hain ke:\n\n• Registration ke dauran di gayi sari jaankaari sahi aur asli hai\n• Aap LFI ka upyog aavaadh, pratibandhit, ya khatarnaak maal ke parivahan ke liye NAHI karenge\n• Aap mulyaankan mein chaaltbaazi, nakli booking, ya bhraaamak listings mein SHAMIL NAHI honge\n• Aap freight vivaadon ko seedha doosre paksha ke saath sulaahenge\n• Aap platform par transactions se hone wali haaniyon ke liye LFI ko zimmedar NAHI theharaenge\n• Aapko India mein transportation contracts mein pravesh karne ka kanooni adhikar hai",
  },
  {
    id: "data",
    icon: "lock-outline",
    iconColor: Colors.info,
    title: "Data Privacy & Security",
    titleHi: "Data Privacy aur Suraksha",
    content:
      "LFI collects the following data: name, phone, city, Aadhaar number, and GST number (for merchants). This data is:\n\n• Used only for platform operation and KYC verification\n• NOT sold or shared with third parties for commercial purposes\n• Shared with law enforcement only when legally mandated\n• Stored securely with encryption\n\nAadhaar numbers are masked in the app interface (only last 4 digits shown) to protect your privacy.",
    contentHi:
      "LFI yeh data collect karta hai: naam, phone, city, Aadhaar number, aur GST number (merchants ke liye). Ye data:\n\n• Sirf platform operation aur KYC verification ke liye upyog kiya jaata hai\n• Vyaaparik uddesshyon ke liye teesre paksha ko NAHI becha ya share kiya jaata\n• Kanooni roop se maange jaane par keval kaanoon pravortan ke saath share kiya jaata hai\n• Encryption ke saath surakshit tarike se store kiya jaata hai\n\nAadhaar numbers app interface mein chhupe hote hain (sirf aakhiri 4 digits dikhaaye jaate hain) aapki privacy ki raksha ke liye.",
  },
  {
    id: "governing",
    icon: "gavel",
    iconColor: Colors.textSecondary,
    title: "Governing Law & Jurisdiction",
    titleHi: "Prabhavi Kaanoon aur Kshetradhikar",
    content:
      "This Privacy Policy and all matters relating to use of LFI are governed by the laws of India, including the Information Technology Act, 2000 and the Consumer Protection Act, 2019. Any disputes shall be subject to the exclusive jurisdiction of courts located in India.\n\nLFI complies with applicable Indian data protection laws and will update this policy as required by law.",
    contentHi:
      "Ye Privacy Policy aur LFI ke upyog se sambandhit sabhi mamle Bharat ke kaanoonon dwara niyantrit hain, jismein Soochna Praudyogiki Adhiniyam, 2000 aur Upbhokta Sanrakshan Adhiniyam, 2019 shaamil hain. Koi bhi vivaad Bharat mein sthit nyayaalayon ke vishesh kshetradhikar ke tahat hoga.\n\nLFI laagu Bhaaratiya data suraksha kaanoonon ka paalan karta hai aur kaanoon dwara aavashyak hone par is niti ko update karega.",
  },
];

function PolicySection({ section }: { section: Section }) {
  const [expanded, setExpanded] = useState(true);
  const [showHindi, setShowHindi] = useState(false);

  return (
    <View
      style={[styles.section, section.important && styles.sectionImportant]}
    >
      <Pressable
        style={styles.sectionHeader}
        onPress={() => setExpanded((v) => !v)}
      >
        <View style={[styles.sectionIconWrap, { backgroundColor: section.iconColor + "22" }]}>
          <MaterialCommunityIcons
            name={section.icon as any}
            size={20}
            color={section.iconColor}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionTitleHi}>{section.titleHi}</Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={Colors.textMuted}
        />
      </Pressable>

      {expanded && (
        <View style={styles.sectionBody}>
          <Pressable
            style={styles.langToggle}
            onPress={() => setShowHindi((v) => !v)}
          >
            <Text style={styles.langToggleText}>
              {showHindi ? "English mein padhen" : "Hindi mein padhen"}
            </Text>
          </Pressable>
          <Text style={styles.sectionContent}>
            {showHindi ? section.contentHi : section.content}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#1A0A00", "#0A0A0F"]}
          style={styles.heroBanner}
        >
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons
              name="shield-lock"
              size={36}
              color={Colors.primary}
            />
          </View>
          <Text style={styles.heroTitle}>Privacy Policy</Text>
          <Text style={styles.heroSubtitle}>Loading Fast India — LFI</Text>
          <Text style={styles.heroDate}>
            Effective Date: 26 March 2025 · Version 1.0
          </Text>

          <View style={styles.disclaimerBox}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={16}
              color={Colors.warning}
            />
            <Text style={styles.disclaimerText}>
              <Text style={{ color: Colors.warning, fontFamily: "Inter_700Bold" }}>
                Important:{" "}
              </Text>
              LFI is a neutral commission-based platform. All freight transactions are directly between Merchant and Driver. LFI is NOT responsible for fraud or disputes between parties.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.sectionsContainer}>
          {SECTIONS.map((section) => (
            <PolicySection key={section.id} section={section} />
          ))}
        </View>

        <View style={styles.footer}>
          <MaterialCommunityIcons
            name="gavel"
            size={16}
            color={Colors.textMuted}
          />
          <Text style={styles.footerText}>
            By using LFI, you acknowledge that you have read, understood, and agreed to this Privacy Policy and our Terms of Service.
          </Text>
        </View>

        <View style={styles.contactBox}>
          <Text style={styles.contactTitle}>Contact / Sampark</Text>
          <Text style={styles.contactText}>
            For legal notices, KYC queries, or fraud reporting:
          </Text>
          <Text style={styles.contactEmail}>legal@loadingfastindia.in</Text>
          <Text style={styles.contactText}>
            Grievance Officer — Loading Fast India, India
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    gap: 0,
  },
  heroBanner: {
    padding: 24,
    paddingTop: 28,
    gap: 6,
    marginBottom: 16,
  },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#1A0A00",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3A1500",
    marginBottom: 8,
    alignSelf: "center",
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
    textAlign: "center",
    marginBottom: 4,
  },
  heroDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 16,
  },
  disclaimerBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#2A1F00",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#5A3A00",
    alignItems: "flex-start",
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  sectionsContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  sectionImportant: {
    borderColor: Colors.warning + "55",
    backgroundColor: "#1C1A10",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  sectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 2,
  },
  sectionTitleHi: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  langToggle: {
    alignSelf: "flex-end",
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  langToggleText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
    textDecorationLine: "underline",
  },
  sectionContent: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    margin: 16,
    marginTop: 20,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "flex-start",
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 19,
  },
  contactBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  contactTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 6,
  },
  contactText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    lineHeight: 18,
  },
  contactEmail: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
});
