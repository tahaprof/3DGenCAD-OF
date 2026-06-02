import os
import re
from google import genai
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

class GeminiAnalyzer:
    """
    يستقبل صورة معالجة من ImageProcessor
    يرجع كود CadQuery جاهز للتنفيذ
    """

    def __init__(self):
        # جمع كل الـ keys الموجودة
        self.api_keys = []
        i = 1
        while True:
            key = os.getenv(f"GEMINI_API_KEY_{i}")
            if not key:
                break
            self.api_keys.append(key)
            i += 1

        # fallback للـ key القديم
        if not self.api_keys:
            single = os.getenv("GEMINI_API_KEY")
            if single:
                self.api_keys.append(single)

        if not self.api_keys:
            raise ValueError("❌ لا يوجد أي GEMINI_API_KEY في ملف .env")

        self.current_key_index = 0
        self.model = "gemini-2.5-flash"
        self.client = self._make_client()
        print(f"✅ {len(self.api_keys)} API key(s) جاهزة")

    # ─────────────────────────────────────────
    # إدارة الـ API Keys
    # ─────────────────────────────────────────
    def _make_client(self):
        return genai.Client(api_key=self.api_keys[self.current_key_index])

    def _switch_key(self):
        next_index = (self.current_key_index + 1) % len(self.api_keys)
        if next_index == self.current_key_index:
            raise RuntimeError("❌ كل الـ API keys استُنزفت — انتظر الغد")
        self.current_key_index = next_index
        self.client = self._make_client()
        print(f"🔄 تم التبديل لـ Key {self.current_key_index + 1}")

    def _generate_with_fallback(self, prompt, image):
        """يرسل الطلب مع التبديل التلقائي بين الـ keys عند الاستنزاف"""
        for attempt in range(len(self.api_keys)):
            try:
                return self.client.models.generate_content(
                    model=self.model,
                    contents=[prompt, image]
                )
            except Exception as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    print(f"⚠️ Key {self.current_key_index + 1} استُنزف")
                    if attempt < len(self.api_keys) - 1:
                        self._switch_key()
                    else:
                        raise RuntimeError("❌ كل الـ API keys استُنزفت — انتظر الغد")
                else:
                    raise

    # ─────────────────────────────────────────
    # الدالة الرئيسية — طلب واحد فقط
    # ─────────────────────────────────────────
    def analyze(self, image: Image.Image) -> dict:
        """
        المدخل : صورة PIL
        المخرج : dict يحتوي على:
                 - dimensions : الأبعاد المستخرجة
                 - shape_type : نوع الشكل
                 - cadquery_code : كود Python جاهز
        """
        print("🔍 جاري تحليل الصورة بـ Gemini...")

        result = self._analyze_and_generate(image)

        print(f"📐 الأبعاد المستخرجة: {result['dimensions']}")
        print(f"🔷 نوع الشكل: {result['shape_type']}")
        print("✅ تم توليد كود CadQuery")

        return result

    # ─────────────────────────────────────────
    # تحليل + توليد في طلب واحد
    # ─────────────────────────────────────────
    def _analyze_and_generate(self, image: Image.Image) -> dict:
        prompt = """
        أنت خبير في قراءة الرسومات الهندسية وكتابة كود CadQuery.
        
        حلّل هذا الرسم الهندسي بدقة واستخرج كل الأبعاد المكتوبة عليه.
        ثم اكتب كود CadQuery يبني نفس القطعة تماماً.
        
        أجب بهذا الشكل الحرفي فقط بدون أي كلام إضافي:
        
        SHAPE_TYPE: [box/cylinder/composite/extrusion]
        LENGTH: [رقم بالـ mm أو N/A]
        WIDTH: [رقم بالـ mm أو N/A]
        HEIGHT: [رقم بالـ mm أو N/A]
        DIAMETER: [رقم بالـ mm أو N/A]
        RADIUS: [رقم بالـ mm أو N/A]
        HOLES: [وصف دقيق أو N/A]
        FEATURES: [وصف أو N/A]
        CODE:
```python
        [كود CadQuery هنا]
```
        
        قواعد الكود الصارمة:
        1. المتغير النهائي يسمى `result` دائماً
        2. لا تكتب أي import — هذه المتغيرات متاحة مباشرة:
           cq, math, cos, sin, tan, radians, degrees, pi, sqrt
        3. لا تستخدم fillet ولا chamfer — تسبب بطء شديد
        4. الكود لا يتجاوز 25 سطر
        5. استخدم الأبعاد الحقيقية من الرسم
        6. للثقوب الدائرية استخدم polarArray أو pushPoints مع hole
        7. للأشكال المركبة استخدم .union() أو .cut()
        8. إذا كانت القطعة اسطوانية استخدم .cylinder(height, radius)
        
        مثال لقطعة اسطوانية بثقب مركزي و6 ثقوب جانبية:
```python
        # الجسم الرئيسي — اسطوانة قطر 100mm ارتفاع 30mm
        body = cq.Workplane("XY").cylinder(30, 50)
        
        # ثقب مركزي قطر 24mm
        body = body.faces(">Z").workplane().circle(12).cutThruAll()
        
        # 6 ثقوب على دائرة قطر 70mm
        points = [
            (35 * cos(radians(i * 60)), 35 * sin(radians(i * 60)))
            for i in range(6)
        ]
        result = body.pushPoints(points).hole(10)
```
        """

        response = self._generate_with_fallback(prompt, image)
        return self._parse_combined(response.text)

    # ─────────────────────────────────────────
    # تحليل الـ response الكامل
    # ─────────────────────────────────────────
    def _parse_combined(self, text: str) -> dict:
        dims = {}
        shape_type = "box"

        lines = text.strip().split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith("SHAPE_TYPE:"):
                shape_type = line.split(":", 1)[1].strip().lower()
            elif line.startswith("LENGTH:"):
                dims["length"] = self._parse_number(line.split(":", 1)[1].strip())
            elif line.startswith("WIDTH:"):
                dims["width"] = self._parse_number(line.split(":", 1)[1].strip())
            elif line.startswith("HEIGHT:"):
                dims["height"] = self._parse_number(line.split(":", 1)[1].strip())
            elif line.startswith("DIAMETER:"):
                dims["diameter"] = self._parse_number(line.split(":", 1)[1].strip())
            elif line.startswith("RADIUS:"):
                dims["radius"] = self._parse_number(line.split(":", 1)[1].strip())
            elif line.startswith("HOLES:"):
                val = line.split(":", 1)[1].strip()
                dims["holes"] = None if val == "N/A" else val
            elif line.startswith("FEATURES:"):
                val = line.split(":", 1)[1].strip()
                dims["features"] = None if val == "N/A" else val

        code = self._extract_code(text)

        return {
            "shape_type": shape_type,
            "dimensions": dims,
            "cadquery_code": code
        }

    # ─────────────────────────────────────────
    # إصلاح الكود تلقائياً
    # ─────────────────────────────────────────
    def fix_code(self, broken_code: str, image) -> str:
        """يطلب من Gemini إصلاح كود CadQuery فاشل"""
        prompt = f"""
        هذا كود CadQuery فشل في التنفيذ:
        
```python
        {broken_code}
```
        
        أصلح الكود ليعمل بشكل صحيح.
        قواعد:
        1. المتغير النهائي يسمى `result`
        2. لا imports — cq و cos و sin و radians و pi متاحة مباشرة
        3. استخدم عمليات CadQuery الأساسية فقط
        4. لا fillets ولا chamfers
        5. الكود لا يتجاوز 20 سطر
        
        أعطني الكود المصحح فقط داخل ```python ```.
        """

        response = self._generate_with_fallback(prompt, image)
        return self._extract_code(response.text)

    # ─────────────────────────────────────────
    # دوال مساعدة
    # ─────────────────────────────────────────
    def _extract_code(self, text: str) -> str:
        pattern = r"```python\s*(.*?)\s*```"
        match = re.search(pattern, text, re.DOTALL)
        if match:
            return match.group(1).strip()
        return text.strip()

    def _parse_number(self, val: str):
        if not val or val == "N/A":
            return None
        try:
            numbers = re.findall(r"[\d.]+", val)
            return float(numbers[0]) if numbers else None
        except:
            return None